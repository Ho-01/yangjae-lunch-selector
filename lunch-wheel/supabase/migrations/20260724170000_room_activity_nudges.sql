-- Lightweight in-app activity feed and ready-member nudges.

create table if not exists public.t_lunch_room_event (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room (id) on delete cascade,
  actor_member_id uuid references public.t_lunch_room_member (id) on delete set null,
  event_type text not null check (
    event_type in (
      'CANDIDATE_ADDED',
      'MEMBER_READY',
      'MEMBER_UNREADY',
      'NUDGE_SENT'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_lunch_room_event_room_created
  on public.t_lunch_room_event (room_id, created_at desc);

alter table public.t_lunch_room_event enable row level security;
revoke all on public.t_lunch_room_event from anon, authenticated;

create or replace function public.log_lunch_room_candidate_added()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.t_lunch_room_event (
    room_id,
    actor_member_id,
    event_type,
    payload
  ) values (
    new.room_id,
    new.added_by_member_id,
    'CANDIDATE_ADDED',
    jsonb_build_object(
      'candidateId', new.id,
      'candidateName', new.name
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_room_candidate_added_event
  on public.t_lunch_room_candidate;
create trigger trg_room_candidate_added_event
  after insert on public.t_lunch_room_candidate
  for each row execute function public.log_lunch_room_candidate_added();

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
  v_was_ready boolean;
begin
  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now())
  for update;

  if not found or v_room.status <> 'OPEN' then
    raise exception '준비 상태를 바꿀 수 없는 방입니다.';
  end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;

  select is_ready into v_was_ready
  from public.t_lunch_room_member
  where id = p_member_id and room_id = v_room.id;

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

  if v_was_ready is distinct from p_is_ready then
    insert into public.t_lunch_room_event (
      room_id, actor_member_id, event_type
    ) values (
      v_room.id,
      p_member_id,
      case when p_is_ready then 'MEMBER_READY' else 'MEMBER_UNREADY' end
    );
  end if;
end;
$$;

create or replace function public.send_lunch_room_nudge(
  p_code text,
  p_member_id uuid,
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_unready_count integer;
begin
  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now())
  for update;

  if not found or v_room.status <> 'OPEN' then
    raise exception '지금은 재촉할 수 없는 방입니다.';
  end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_ready
  ) then
    raise exception '먼저 준비 완료해주세요.';
  end if;

  select count(*) into v_unready_count
  from public.t_lunch_room_member
  where room_id = v_room.id
    and id <> p_member_id
    and not is_ready;
  if v_unready_count = 0 then
    raise exception '재촉할 참여자가 없습니다.';
  end if;

  if exists (
    select 1 from public.t_lunch_room_event
    where room_id = v_room.id
      and actor_member_id = p_member_id
      and event_type = 'NUDGE_SENT'
      and created_at > timezone('utc', now()) - interval '60 seconds'
  ) then
    raise exception '재촉은 60초에 한 번 보낼 수 있어요.';
  end if;

  insert into public.t_lunch_room_event (
    room_id, actor_member_id, event_type, payload
  ) values (
    v_room.id,
    p_member_id,
    'NUDGE_SENT',
    jsonb_build_object('unreadyCount', v_unready_count)
  );
end;
$$;

create or replace function public.get_lunch_room_events(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
begin
  select id into v_room_id
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now());
  if v_room_id is null then
    raise exception '유효한 점심방을 찾지 못했습니다.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', event.id,
      'type', event.event_type,
      'actorMemberId', event.actor_member_id,
      'actorNickname', member.nickname,
      'payload', event.payload,
      'createdAt', event.created_at
    ) order by event.created_at)
    from (
      select *
      from public.t_lunch_room_event
      where room_id = v_room_id
      order by created_at desc
      limit 20
    ) event
    left join public.t_lunch_room_member member
      on member.id = event.actor_member_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.send_lunch_room_nudge(text, uuid, text)
  from public;
revoke all on function public.get_lunch_room_events(text)
  from public;

grant execute on function public.send_lunch_room_nudge(text, uuid, text)
  to anon, authenticated;
grant execute on function public.get_lunch_room_events(text)
  to anon, authenticated;

notify pgrst, 'reload schema';
