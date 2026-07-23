create or replace function public.add_lunch_room_candidates(
  p_code text,
  p_member_id uuid,
  p_token text,
  p_candidates jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
begin
  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now());

  if not found or v_room.status <> 'OPEN' then
    raise exception '후보를 추가할 수 없는 방입니다.';
  end if;

  if not public.lunch_room_member_valid(
    v_room.id, p_member_id, p_token
  ) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;

  if jsonb_typeof(p_candidates) <> 'array' then
    raise exception '후보 목록 형식이 올바르지 않습니다.';
  end if;

  if (
    select count(*)
    from public.t_lunch_room_candidate
    where room_id = v_room.id
  ) + jsonb_array_length(p_candidates) > 30 then
    raise exception '후보는 최대 30개까지 추가할 수 있습니다.';
  end if;

  return public.insert_room_candidates(
    v_room.id, p_member_id, p_candidates
  );
end;
$$;

revoke all on function public.add_lunch_room_candidates(
  text, uuid, text, jsonb
) from public;

grant execute on function public.add_lunch_room_candidates(
  text, uuid, text, jsonb
) to anon, authenticated;

notify pgrst, 'reload schema';

