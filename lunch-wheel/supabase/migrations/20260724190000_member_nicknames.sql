-- Let anonymous room members rename themselves and record the activity.

alter table public.t_lunch_room_event
  drop constraint if exists t_lunch_room_event_event_type_check;
alter table public.t_lunch_room_event
  add constraint t_lunch_room_event_event_type_check check (
    event_type in (
      'CANDIDATE_ADDED',
      'MEMBER_READY',
      'MEMBER_UNREADY',
      'MEMBER_RENAMED',
      'NUDGE_SENT'
    )
  );

create or replace function public.rename_lunch_room_member(
  p_code text,
  p_member_id uuid,
  p_token text,
  p_nickname text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_old_nickname text;
  v_nickname text := trim(coalesce(p_nickname, ''));
begin
  if char_length(v_nickname) not between 1 and 20 then
    raise exception '닉네임은 1~20자로 입력해주세요.';
  end if;

  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now());
  if not found then
    raise exception '유효한 점심방을 찾지 못했습니다.';
  end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;

  select nickname into v_old_nickname
  from public.t_lunch_room_member
  where id = p_member_id and room_id = v_room.id
  for update;

  if v_old_nickname = v_nickname then return; end if;

  update public.t_lunch_room_member
  set nickname = v_nickname,
      last_seen_at = timezone('utc', now())
  where id = p_member_id and room_id = v_room.id;

  insert into public.t_lunch_room_event (
    room_id, actor_member_id, event_type, payload
  ) values (
    v_room.id,
    p_member_id,
    'MEMBER_RENAMED',
    jsonb_build_object(
      'oldNickname', v_old_nickname,
      'newNickname', v_nickname
    )
  );
end;
$$;

revoke all on function public.rename_lunch_room_member(
  text, uuid, text, text
) from public;
grant execute on function public.rename_lunch_room_member(
  text, uuid, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';
