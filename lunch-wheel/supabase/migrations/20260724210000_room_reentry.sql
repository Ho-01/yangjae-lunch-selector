-- Token-verified room re-entry and recent-room summaries.

create or replace function public.resume_lunch_room(
  p_code text,
  p_member_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_member public.t_lunch_room_member;
begin
  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code));

  if not found then
    raise exception 'ROOM_NOT_FOUND: 점심방을 찾지 못했습니다.';
  end if;
  if v_room.expires_at <= timezone('utc', now()) then
    raise exception 'ROOM_EXPIRED: 만료된 점심방입니다.';
  end if;

  select * into v_member
  from public.t_lunch_room_member
  where id = p_member_id
    and room_id = v_room.id
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found then
    raise exception 'ROOM_SESSION_INVALID: 재입장 정보가 유효하지 않습니다.';
  end if;

  update public.t_lunch_room_member
  set last_seen_at = timezone('utc', now())
  where id = v_member.id;

  return jsonb_build_object(
    'code', v_room.code,
    'memberId', v_member.id,
    'isHost', v_member.is_host,
    'nickname', v_member.nickname,
    'status', v_room.status,
    'locationLabel', v_room.location_label,
    'memberCount', (
      select count(*) from public.t_lunch_room_member
      where room_id = v_room.id
    ),
    'expiresAt', v_room.expires_at,
    'updatedAt', v_room.updated_at
  );
end;
$$;

revoke all on function public.resume_lunch_room(text, uuid, text) from public;
grant execute on function public.resume_lunch_room(text, uuid, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
