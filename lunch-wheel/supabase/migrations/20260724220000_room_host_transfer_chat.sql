-- Host transfer and token-protected lightweight room chat.

alter table public.t_lunch_room_event
  drop constraint if exists t_lunch_room_event_event_type_check;
alter table public.t_lunch_room_event
  add constraint t_lunch_room_event_event_type_check
  check (event_type in (
    'CANDIDATE_ADDED', 'MEMBER_READY', 'MEMBER_UNREADY',
    'MEMBER_RENAMED', 'NUDGE_SENT', 'HOST_TRANSFERRED'
  ));

create table public.t_lunch_room_message (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room(id) on delete cascade,
  member_id uuid not null references public.t_lunch_room_member(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_lunch_room_message_room_created
  on public.t_lunch_room_message(room_id, created_at desc);

alter table public.t_lunch_room_message enable row level security;
revoke all on public.t_lunch_room_message from anon, authenticated;

create or replace function public.transfer_lunch_room_host(
  p_code text, p_member_id uuid, p_token text, p_target_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now())
  for update;
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 권한을 넘길 수 있습니다.'; end if;
  if p_target_member_id = p_member_id then
    raise exception '이미 방장입니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_target_member_id and room_id = v_room.id
  ) then raise exception '방에 없는 참여자입니다.'; end if;

  update public.t_lunch_room_member set is_host = false
  where id = p_member_id and room_id = v_room.id;
  update public.t_lunch_room_member set is_host = true
  where id = p_target_member_id and room_id = v_room.id;

  insert into public.t_lunch_room_event(
    room_id, actor_member_id, event_type, payload
  ) values (
    v_room.id, p_member_id, 'HOST_TRANSFERRED',
    jsonb_build_object('targetMemberId', p_target_member_id)
  );
end;
$$;

create or replace function public.send_lunch_room_message(
  p_code text, p_member_id uuid, p_token text, p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_message public.t_lunch_room_message;
  v_nickname text;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now());
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 300 then
    raise exception '메시지는 1~300자로 입력해주세요.';
  end if;
  if exists (
    select 1 from public.t_lunch_room_message
    where member_id = p_member_id
      and created_at > timezone('utc', now()) - interval '1 second'
  ) then raise exception '메시지를 너무 빠르게 보내고 있어요.'; end if;

  insert into public.t_lunch_room_message(room_id, member_id, body)
  values (v_room.id, p_member_id, trim(p_body))
  returning * into v_message;

  select nickname into v_nickname from public.t_lunch_room_member
  where id = p_member_id;

  return jsonb_build_object(
    'id', v_message.id, 'memberId', p_member_id,
    'nickname', v_nickname, 'body', v_message.body,
    'createdAt', v_message.created_at
  );
end;
$$;

create or replace function public.get_lunch_room_messages(
  p_code text, p_member_id uuid, p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_room public.t_lunch_room;
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now());
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', message.id,
      'memberId', message.member_id,
      'nickname', member.nickname,
      'body', message.body,
      'createdAt', message.created_at
    ) order by message.created_at)
    from (
      select * from public.t_lunch_room_message
      where room_id = v_room.id
      order by created_at desc limit 100
    ) message
    join public.t_lunch_room_member member on member.id = message.member_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.transfer_lunch_room_host(text,uuid,text,uuid) from public;
revoke all on function public.send_lunch_room_message(text,uuid,text,text) from public;
revoke all on function public.get_lunch_room_messages(text,uuid,text) from public;
grant execute on function public.transfer_lunch_room_host(text,uuid,text,uuid) to anon, authenticated;
grant execute on function public.send_lunch_room_message(text,uuid,text,text) to anon, authenticated;
grant execute on function public.get_lunch_room_messages(text,uuid,text) to anon, authenticated;

notify pgrst, 'reload schema';
