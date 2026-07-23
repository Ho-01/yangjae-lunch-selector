-- Flexible room candidates: team menus, nearby Places, searched Places, or manual names.

create table public.t_lunch_room_candidate (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room (id) on delete cascade,
  source_type text not null check (source_type in ('TEAM_MENU', 'NEARBY', 'PLACE_SEARCH', 'MANUAL')),
  menu_id uuid references public.t_menu (id) on delete set null,
  provider text,
  place_id text,
  name text not null check (char_length(name) between 1 and 80),
  address text,
  rating numeric(2, 1),
  rating_count integer,
  metadata jsonb not null default '{}'::jsonb,
  added_by_member_id uuid references public.t_lunch_room_member (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index idx_room_candidate_place_unique
  on public.t_lunch_room_candidate (room_id, provider, place_id)
  where place_id is not null;
create index idx_room_candidate_room_sort
  on public.t_lunch_room_candidate (room_id, sort_order, created_at);

create table public.t_lunch_room_candidate_vote (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room (id) on delete cascade,
  member_id uuid not null references public.t_lunch_room_member (id) on delete cascade,
  candidate_id uuid not null references public.t_lunch_room_candidate (id) on delete cascade,
  vote_type text not null check (vote_type in ('LIKE', 'VETO')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (member_id, candidate_id, vote_type)
);

create index idx_room_candidate_vote_room
  on public.t_lunch_room_candidate_vote (room_id, candidate_id, vote_type);

alter table public.t_lunch_room
  add column location_mode text not null default 'TEAM'
    check (location_mode in ('TEAM', 'NEARBY', 'NONE')),
  add column location_label text,
  add column center_latitude double precision,
  add column center_longitude double precision,
  add column radius_meters integer,
  add column finalist_candidate_ids uuid[] not null default '{}'::uuid[],
  add column winner_candidate_id uuid references public.t_lunch_room_candidate (id) on delete set null;

alter table public.t_lunch_room_candidate enable row level security;
alter table public.t_lunch_room_candidate_vote enable row level security;
revoke all on public.t_lunch_room_candidate from anon, authenticated;
revoke all on public.t_lunch_room_candidate_vote from anon, authenticated;

-- Preserve rooms created by the first MVP migration.
insert into public.t_lunch_room_candidate (
  room_id, source_type, menu_id, name, sort_order
)
select room.id, 'TEAM_MENU', menu.id, menu.name, ordinality::integer
from public.t_lunch_room room
cross join lateral unnest(room.menu_ids) with ordinality as room_menu(menu_id, ordinality)
join public.t_menu menu on menu.id = room_menu.menu_id
where not exists (
  select 1 from public.t_lunch_room_candidate candidate
  where candidate.room_id = room.id and candidate.menu_id = menu.id
);

create or replace function public.insert_room_candidates(
  p_room_id uuid,
  p_member_id uuid,
  p_candidates jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_candidates) <> 'array' then
    raise exception '후보 목록 형식이 올바르지 않습니다.';
  end if;
  if jsonb_array_length(p_candidates) > 30 then
    raise exception '후보는 최대 30개까지 추가할 수 있습니다.';
  end if;

  insert into public.t_lunch_room_candidate (
    room_id, source_type, menu_id, provider, place_id, name, address,
    rating, rating_count, metadata, added_by_member_id, sort_order
  )
  select
    p_room_id,
    coalesce(item ->> 'sourceType', 'MANUAL'),
    nullif(item ->> 'menuId', '')::uuid,
    nullif(item ->> 'provider', ''),
    nullif(item ->> 'placeId', ''),
    trim(item ->> 'name'),
    nullif(item ->> 'address', ''),
    nullif(item ->> 'rating', '')::numeric,
    nullif(item ->> 'ratingCount', '')::integer,
    coalesce(item -> 'metadata', '{}'::jsonb),
    p_member_id,
    coalesce((item ->> 'sortOrder')::integer, ordinality::integer)
  from jsonb_array_elements(p_candidates) with ordinality as items(item, ordinality)
  where char_length(trim(coalesce(item ->> 'name', ''))) between 1 and 80
  on conflict (room_id, provider, place_id) where place_id is not null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.create_lunch_room_v2(
  p_team_id uuid,
  p_nickname text,
  p_client_id text,
  p_location_mode text,
  p_location_label text,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_member public.t_lunch_room_member;
  v_code text;
  v_token text := gen_random_uuid()::text;
begin
  if char_length(trim(p_nickname)) not between 1 and 20 then
    raise exception '닉네임은 1~20자로 입력해주세요.';
  end if;
  if char_length(coalesce(p_client_id, '')) < 8 then
    raise exception '유효하지 않은 클라이언트입니다.';
  end if;
  if jsonb_array_length(coalesce(p_candidates, '[]'::jsonb)) < 2 then
    raise exception '후보를 2개 이상 준비해주세요.';
  end if;

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.t_lunch_room where code = v_code);
  end loop;

  insert into public.t_lunch_room (
    team_id, code, menu_ids, location_mode, location_label,
    center_latitude, center_longitude, radius_meters
  ) values (
    p_team_id, v_code, '{}'::uuid[], p_location_mode, nullif(trim(p_location_label), ''),
    p_latitude, p_longitude, greatest(100, least(coalesce(p_radius_meters, 1000), 5000))
  ) returning * into v_room;

  insert into public.t_lunch_room_member (
    room_id, nickname, client_id, token_hash, is_host
  ) values (
    v_room.id, trim(p_nickname), p_client_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'), true
  ) returning * into v_member;

  perform public.insert_room_candidates(v_room.id, v_member.id, p_candidates);

  return jsonb_build_object(
    'code', v_room.code, 'memberId', v_member.id, 'token', v_token, 'isHost', true
  );
end;
$$;

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

  return jsonb_build_object(
    'id', v_room.id, 'code', v_room.code, 'status', v_room.status,
    'locationMode', v_room.location_mode, 'locationLabel', v_room.location_label,
    'latitude', v_room.center_latitude, 'longitude', v_room.center_longitude,
    'radiusMeters', v_room.radius_meters,
    'candidateMenuIds', to_jsonb(v_room.finalist_candidate_ids),
    'winnerMenuId', v_room.winner_candidate_id, 'expiresAt', v_room.expires_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nickname', m.nickname, 'isHost', m.is_host
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

create or replace function public.add_lunch_room_candidates(
  p_code text, p_member_id uuid, p_token text, p_candidates jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now());
  if not found or v_room.status <> 'OPEN' then raise exception '후보를 추가할 수 없는 방입니다.'; end if;
  if not exists (select 1 from public.t_lunch_room_member where id = p_member_id
    and room_id = v_room.id and is_host
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
  then raise exception '방장만 후보를 추가할 수 있습니다.'; end if;
  if (select count(*) from public.t_lunch_room_candidate where room_id = v_room.id)
      + jsonb_array_length(p_candidates) > 30
  then raise exception '후보는 최대 30개까지 추가할 수 있습니다.'; end if;
  return public.insert_room_candidates(v_room.id, p_member_id, p_candidates);
end;
$$;

create or replace function public.remove_lunch_room_candidate(
  p_code text, p_member_id uuid, p_token text, p_candidate_id uuid
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room where code = upper(trim(p_code));
  if not found or v_room.status <> 'OPEN' then raise exception '후보를 삭제할 수 없습니다.'; end if;
  if not exists (select 1 from public.t_lunch_room_member where id = p_member_id
    and room_id = v_room.id and is_host
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
  then raise exception '방장만 후보를 삭제할 수 있습니다.'; end if;
  if (select count(*) from public.t_lunch_room_candidate where room_id = v_room.id) <= 2
  then raise exception '후보는 2개 이상 남아야 합니다.'; end if;
  delete from public.t_lunch_room_candidate where id = p_candidate_id and room_id = v_room.id;
end; $$;

create or replace function public.save_lunch_room_candidate_votes(
  p_code text, p_member_id uuid, p_token text,
  p_like_candidate_ids uuid[], p_veto_candidate_id uuid default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room where code = upper(trim(p_code));
  if not found or v_room.status <> 'OPEN' then raise exception '투표가 마감되었습니다.'; end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token)
  then raise exception '참여자 인증에 실패했습니다.'; end if;
  if coalesce(array_length(p_like_candidate_ids, 1), 0) > 3 then raise exception '최대 3개까지 선택할 수 있습니다.'; end if;
  if p_veto_candidate_id = any(coalesce(p_like_candidate_ids, '{}'::uuid[]))
  then raise exception '같은 후보를 좋아요와 제외로 동시에 선택할 수 없습니다.'; end if;
  if exists (select 1 from unnest(coalesce(p_like_candidate_ids, '{}'::uuid[])) id
    where not exists (select 1 from public.t_lunch_room_candidate c where c.id = id and c.room_id = v_room.id))
  then raise exception '방에 없는 후보입니다.'; end if;
  if p_veto_candidate_id is not null and not exists (
    select 1 from public.t_lunch_room_candidate
    where id = p_veto_candidate_id and room_id = v_room.id
  ) then raise exception '방에 없는 후보입니다.'; end if;

  delete from public.t_lunch_room_candidate_vote where member_id = p_member_id;
  insert into public.t_lunch_room_candidate_vote (room_id, member_id, candidate_id, vote_type)
  select v_room.id, p_member_id, id, 'LIKE'
  from (select distinct id from unnest(coalesce(p_like_candidate_ids, '{}'::uuid[])) id) likes;
  if p_veto_candidate_id is not null then
    insert into public.t_lunch_room_candidate_vote values (
      gen_random_uuid(), v_room.id, p_member_id, p_veto_candidate_id, 'VETO', timezone('utc', now())
    );
  end if;
end; $$;

create or replace function public.close_lunch_room_voting_v2(
  p_code text, p_member_id uuid, p_token text
)
returns uuid[] language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room public.t_lunch_room; v_finalists uuid[];
begin
  select * into v_room from public.t_lunch_room where code = upper(trim(p_code)) for update;
  if not found or v_room.status <> 'OPEN' then raise exception '이미 마감된 방입니다.'; end if;
  if not exists (select 1 from public.t_lunch_room_member where id = p_member_id
    and room_id = v_room.id and is_host
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
  then raise exception '방장만 마감할 수 있습니다.'; end if;

  select array_agg(id order by score desc, likes desc, random()) into v_finalists
  from (
    select c.id,
      count(v.id) filter (where v.vote_type = 'LIKE') likes,
      count(v.id) filter (where v.vote_type = 'LIKE')
        - count(v.id) filter (where v.vote_type = 'VETO') * 2 score
    from public.t_lunch_room_candidate c
    left join public.t_lunch_room_candidate_vote v on v.candidate_id = c.id
    where c.room_id = v_room.id group by c.id
    order by score desc, likes desc, random() limit 3
  ) ranked;

  update public.t_lunch_room set status = 'VOTING_CLOSED',
    finalist_candidate_ids = v_finalists where id = v_room.id;
  return v_finalists;
end; $$;

create or replace function public.complete_lunch_room_v2(
  p_code text, p_member_id uuid, p_token text, p_winner_candidate_id uuid
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room where code = upper(trim(p_code)) for update;
  if not found or v_room.status <> 'VOTING_CLOSED' then raise exception '룰렛을 돌릴 수 없는 상태입니다.'; end if;
  if not exists (select 1 from public.t_lunch_room_member where id = p_member_id
    and room_id = v_room.id and is_host
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
  then raise exception '방장만 결과를 확정할 수 있습니다.'; end if;
  if not (p_winner_candidate_id = any(v_room.finalist_candidate_ids))
  then raise exception '최종 후보가 아닙니다.'; end if;
  update public.t_lunch_room set status = 'COMPLETED',
    winner_candidate_id = p_winner_candidate_id where id = v_room.id;
end; $$;

revoke all on function public.insert_room_candidates(uuid, uuid, jsonb) from public;
revoke all on function public.create_lunch_room_v2(uuid,text,text,text,text,double precision,double precision,integer,jsonb) from public;
revoke all on function public.get_lunch_room_v2(text) from public;
revoke all on function public.add_lunch_room_candidates(text,uuid,text,jsonb) from public;
revoke all on function public.remove_lunch_room_candidate(text,uuid,text,uuid) from public;
revoke all on function public.save_lunch_room_candidate_votes(text,uuid,text,uuid[],uuid) from public;
revoke all on function public.close_lunch_room_voting_v2(text,uuid,text) from public;
revoke all on function public.complete_lunch_room_v2(text,uuid,text,uuid) from public;

grant execute on function public.create_lunch_room_v2(uuid,text,text,text,text,double precision,double precision,integer,jsonb) to anon, authenticated;
grant execute on function public.get_lunch_room_v2(text) to anon, authenticated;
grant execute on function public.add_lunch_room_candidates(text,uuid,text,jsonb) to anon, authenticated;
grant execute on function public.remove_lunch_room_candidate(text,uuid,text,uuid) to anon, authenticated;
grant execute on function public.save_lunch_room_candidate_votes(text,uuid,text,uuid[],uuid) to anon, authenticated;
grant execute on function public.close_lunch_room_voting_v2(text,uuid,text) to anon, authenticated;
grant execute on function public.complete_lunch_room_v2(text,uuid,text,uuid) to anon, authenticated;

notify pgrst, 'reload schema';
