create or replace function public.create_empty_lunch_room(
  p_team_id uuid, p_nickname text, p_client_id text
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
  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.t_lunch_room where code = v_code);
  end loop;
  insert into public.t_lunch_room (
    team_id, code, menu_ids, location_mode, location_label
  ) values (
    p_team_id, v_code, '{}'::uuid[], 'NONE', '위치 지정 없음'
  ) returning * into v_room;
  insert into public.t_lunch_room_member (
    room_id, nickname, client_id, token_hash, is_host
  ) values (
    v_room.id, trim(p_nickname), p_client_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'), true
  ) returning * into v_member;
  return jsonb_build_object(
    'code', v_room.code, 'memberId', v_member.id,
    'token', v_token, 'isHost', true
  );
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
declare v_room public.t_lunch_room; v_finalists uuid[];
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) for update;
  if not found or v_room.status <> 'OPEN' then
    raise exception '이미 마감된 방입니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 마감할 수 있습니다.'; end if;
  if (select count(*) from public.t_lunch_room_candidate where room_id = v_room.id) < 2 then
    raise exception '후보를 2개 이상 추가해주세요.';
  end if;
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

revoke all on function public.create_empty_lunch_room(uuid,text,text) from public;
grant execute on function public.create_empty_lunch_room(uuid,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
