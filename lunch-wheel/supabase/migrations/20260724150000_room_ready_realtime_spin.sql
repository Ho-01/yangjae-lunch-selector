-- Ready checks and a server-authoritative synchronized room spin.

alter table public.t_lunch_room_member
  add column if not exists is_ready boolean not null default false,
  add column if not exists ready_at timestamptz;

alter table public.t_lunch_room
  add column if not exists spin_started_at timestamptz,
  add column if not exists spin_duration_ms integer not null default 4300;

alter table public.t_lunch_room
  drop constraint if exists t_lunch_room_status_check;
alter table public.t_lunch_room
  add constraint t_lunch_room_status_check
  check (status in ('OPEN', 'VOTING_CLOSED', 'SPINNING', 'COMPLETED'));

create or replace function public.reset_lunch_room_ready_on_candidate_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid := coalesce(new.room_id, old.room_id);
begin
  if exists (
    select 1 from public.t_lunch_room
    where id = v_room_id and status = 'OPEN'
  ) then
    update public.t_lunch_room_member
    set is_ready = false, ready_at = null
    where room_id = v_room_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_room_candidate_reset_ready
  on public.t_lunch_room_candidate;
create trigger trg_room_candidate_reset_ready
  after insert or update or delete on public.t_lunch_room_candidate
  for each row execute function public.reset_lunch_room_ready_on_candidate_change();

create or replace function public.get_lunch_room_v2(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now());
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;

  -- Recover a room if the host closed the page during the animation.
  if v_room.status = 'SPINNING'
    and v_room.spin_started_at
      + make_interval(secs => (v_room.spin_duration_ms + 2000)::double precision / 1000)
      <= timezone('utc', now())
  then
    update public.t_lunch_room
    set status = 'COMPLETED'
    where id = v_room.id and status = 'SPINNING'
    returning * into v_room;
  end if;

  return jsonb_build_object(
    'id', v_room.id, 'code', v_room.code, 'status', v_room.status,
    'locationMode', v_room.location_mode, 'locationLabel', v_room.location_label,
    'latitude', v_room.center_latitude, 'longitude', v_room.center_longitude,
    'radiusMeters', v_room.radius_meters,
    'candidateMenuIds', to_jsonb(v_room.finalist_candidate_ids),
    'winnerMenuId', v_room.winner_candidate_id,
    'spinStartedAt', v_room.spin_started_at,
    'spinDurationMs', v_room.spin_duration_ms,
    'expiresAt', v_room.expires_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nickname', m.nickname, 'isHost', m.is_host,
        'isReady', m.is_ready, 'readyAt', m.ready_at
      ) order by m.joined_at)
      from public.t_lunch_room_member m where m.room_id = v_room.id
    ), '[]'::jsonb),
    'menus', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'sourceType', c.source_type,
        'placeId', c.place_id, 'address', c.address, 'rating', c.rating,
        'ratingCount', c.rating_count, 'metadata', c.metadata,
        'likeCount', (select count(*) from public.t_lunch_room_candidate_vote v
          where v.candidate_id = c.id and v.vote_type = 'LIKE'),
        'vetoCount', (select count(*) from public.t_lunch_room_candidate_vote v
          where v.candidate_id = c.id and v.vote_type = 'VETO')
      ) order by c.sort_order, c.created_at)
      from public.t_lunch_room_candidate c where c.room_id = v_room.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_lunch_room_member_ready(
  p_code text,
  p_member_id uuid,
  p_token text,
  p_is_ready boolean,
  p_like_candidate_ids uuid[] default '{}'::uuid[],
  p_veto_candidate_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now())
  for update;
  if not found or v_room.status <> 'OPEN' then
    raise exception '준비 상태를 바꿀 수 없는 방입니다.';
  end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;

  if p_is_ready then
    perform public.save_lunch_room_candidate_votes(
      p_code, p_member_id, p_token,
      coalesce(p_like_candidate_ids, '{}'::uuid[]), p_veto_candidate_id
    );
  end if;

  update public.t_lunch_room_member
  set is_ready = p_is_ready,
      ready_at = case when p_is_ready then timezone('utc', now()) else null end,
      last_seen_at = timezone('utc', now())
  where id = p_member_id and room_id = v_room.id;
end;
$$;

create or replace function public.close_lunch_room_voting_v2(
  p_code text, p_member_id uuid, p_token text
)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_finalists uuid[];
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now())
  for update;
  if not found or v_room.status <> 'OPEN' then
    raise exception '이미 마감된 방입니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 최종 후보를 결정할 수 있습니다.'; end if;
  if exists (
    select 1 from public.t_lunch_room_member
    where room_id = v_room.id and not is_ready
  ) then raise exception '모든 참여자가 준비 완료해야 합니다.'; end if;
  if (select count(*) from public.t_lunch_room_candidate where room_id = v_room.id) < 2
  then raise exception '후보가 2개 이상 필요합니다.'; end if;

  select array_agg(id order by score desc, likes desc, random()) into v_finalists
  from (
    select c.id,
      count(v.id) filter (where v.vote_type = 'LIKE') likes,
      count(v.id) filter (where v.vote_type = 'LIKE')
        - count(v.id) filter (where v.vote_type = 'VETO') * 2 score
    from public.t_lunch_room_candidate c
    left join public.t_lunch_room_candidate_vote v on v.candidate_id = c.id
    where c.room_id = v_room.id
    group by c.id
    order by score desc, likes desc, random()
    limit 3
  ) ranked;

  update public.t_lunch_room
  set status = 'VOTING_CLOSED', finalist_candidate_ids = v_finalists
  where id = v_room.id;
  return v_finalists;
end;
$$;

create or replace function public.start_lunch_room_spin(
  p_code text, p_member_id uuid, p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_winner uuid;
  v_started_at timestamptz := timezone('utc', now()) + interval '700 milliseconds';
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now())
  for update;
  if not found or v_room.status <> 'VOTING_CLOSED' then
    raise exception '룰렛을 시작할 수 없는 상태입니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 룰렛을 시작할 수 있습니다.'; end if;

  select candidate_id into v_winner
  from unnest(v_room.finalist_candidate_ids) candidate_id
  order by random()
  limit 1;
  if v_winner is null then raise exception '최종 후보가 없습니다.'; end if;

  update public.t_lunch_room
  set status = 'SPINNING',
      winner_candidate_id = v_winner,
      spin_started_at = v_started_at
  where id = v_room.id;

  return jsonb_build_object(
    'winnerMenuId', v_winner,
    'spinStartedAt', v_started_at,
    'spinDurationMs', v_room.spin_duration_ms
  );
end;
$$;

create or replace function public.complete_lunch_room_v2(
  p_code text, p_member_id uuid, p_token text, p_winner_candidate_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) for update;
  if not found or v_room.status <> 'SPINNING' then
    raise exception '완료할 수 없는 룰렛입니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 결과를 확정할 수 있습니다.'; end if;
  if p_winner_candidate_id is distinct from v_room.winner_candidate_id then
    raise exception '서버가 정한 결과와 일치하지 않습니다.';
  end if;

  update public.t_lunch_room set status = 'COMPLETED' where id = v_room.id;
end;
$$;

revoke all on function public.set_lunch_room_member_ready(
  text, uuid, text, boolean, uuid[], uuid
) from public;
revoke all on function public.start_lunch_room_spin(text, uuid, text) from public;

grant execute on function public.set_lunch_room_member_ready(
  text, uuid, text, boolean, uuid[], uuid
) to anon, authenticated;
grant execute on function public.start_lunch_room_spin(
  text, uuid, text
) to anon, authenticated;

notify pgrst, 'reload schema';
