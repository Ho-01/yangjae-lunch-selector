-- Anonymous lunch rooms. Tables stay private; clients use token-checked RPCs.

create table public.t_lunch_room (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  code text not null unique,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'VOTING_CLOSED', 'COMPLETED')),
  menu_ids uuid[] not null,
  candidate_menu_ids uuid[] not null default '{}'::uuid[],
  winner_menu_id uuid references public.t_menu (id) on delete set null,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '6 hours'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.t_lunch_room_member (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  client_id text not null,
  token_hash text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  unique (room_id, client_id)
);

create table public.t_lunch_room_vote (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.t_lunch_room (id) on delete cascade,
  member_id uuid not null references public.t_lunch_room_member (id) on delete cascade,
  menu_id uuid not null references public.t_menu (id) on delete cascade,
  vote_type text not null check (vote_type in ('LIKE', 'VETO')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (member_id, menu_id, vote_type)
);

create index idx_lunch_room_code_active
  on public.t_lunch_room (code, expires_at);
create index idx_lunch_room_member_room
  on public.t_lunch_room_member (room_id, joined_at);
create index idx_lunch_room_vote_room_menu
  on public.t_lunch_room_vote (room_id, menu_id, vote_type);

create trigger trg_lunch_room_updated_at
  before update on public.t_lunch_room
  for each row execute function public.set_updated_at();

alter table public.t_lunch_room enable row level security;
alter table public.t_lunch_room_member enable row level security;
alter table public.t_lunch_room_vote enable row level security;

revoke all on public.t_lunch_room from anon, authenticated;
revoke all on public.t_lunch_room_member from anon, authenticated;
revoke all on public.t_lunch_room_vote from anon, authenticated;

create or replace function public.lunch_room_member_valid(
  p_room_id uuid,
  p_member_id uuid,
  p_token text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.t_lunch_room_member
    where id = p_member_id
      and room_id = p_room_id
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  );
$$;

create or replace function public.create_lunch_room(
  p_team_id uuid,
  p_nickname text,
  p_client_id text
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
  v_menu_ids uuid[];
begin
  if char_length(trim(p_nickname)) not between 1 and 20 then
    raise exception '닉네임은 1~20자로 입력해주세요.';
  end if;
  if char_length(coalesce(p_client_id, '')) < 8 then
    raise exception '유효하지 않은 클라이언트입니다.';
  end if;

  select array_agg(id order by sort_order, id)
    into v_menu_ids
  from public.t_menu
  where team_id = p_team_id and is_active = true;

  if coalesce(array_length(v_menu_ids, 1), 0) < 2 then
    raise exception '활성 메뉴가 2개 이상 필요합니다.';
  end if;

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.t_lunch_room where code = v_code);
  end loop;

  insert into public.t_lunch_room (team_id, code, menu_ids)
  values (p_team_id, v_code, v_menu_ids)
  returning * into v_room;

  insert into public.t_lunch_room_member (
    room_id, nickname, client_id, token_hash, is_host
  ) values (
    v_room.id,
    trim(p_nickname),
    p_client_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    true
  )
  returning * into v_member;

  return jsonb_build_object(
    'code', v_room.code,
    'memberId', v_member.id,
    'token', v_token,
    'isHost', true
  );
end;
$$;

create or replace function public.join_lunch_room(
  p_code text,
  p_nickname text,
  p_client_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_member public.t_lunch_room_member;
  v_token text := gen_random_uuid()::text;
begin
  if char_length(trim(p_nickname)) not between 1 and 20 then
    raise exception '닉네임은 1~20자로 입력해주세요.';
  end if;
  if char_length(coalesce(p_client_id, '')) < 8 then
    raise exception '유효하지 않은 클라이언트입니다.';
  end if;

  select * into v_room
  from public.t_lunch_room
  where code = upper(trim(p_code))
    and expires_at > timezone('utc', now());

  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if v_room.status <> 'OPEN' then raise exception '이미 투표가 마감된 방입니다.'; end if;
  if (select count(*) from public.t_lunch_room_member where room_id = v_room.id) >= 20 then
    raise exception '참여 인원이 가득 찼습니다.';
  end if;

  insert into public.t_lunch_room_member (
    room_id, nickname, client_id, token_hash
  ) values (
    v_room.id,
    trim(p_nickname),
    p_client_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex')
  )
  on conflict (room_id, client_id) do update set
    nickname = excluded.nickname,
    token_hash = excluded.token_hash,
    last_seen_at = timezone('utc', now())
  returning * into v_member;

  return jsonb_build_object(
    'code', v_room.code,
    'memberId', v_member.id,
    'token', v_token,
    'isHost', v_member.is_host
  );
end;
$$;

create or replace function public.get_lunch_room(p_code text)
returns jsonb
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

  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'candidateMenuIds', to_jsonb(v_room.candidate_menu_ids),
    'winnerMenuId', v_room.winner_menu_id,
    'expiresAt', v_room.expires_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'nickname', m.nickname,
        'isHost', m.is_host
      ) order by m.joined_at)
      from public.t_lunch_room_member m
      where m.room_id = v_room.id
    ), '[]'::jsonb),
    'menus', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', menu.id,
        'name', menu.name,
        'likeCount', (
          select count(*) from public.t_lunch_room_vote vote
          where vote.room_id = v_room.id
            and vote.menu_id = menu.id
            and vote.vote_type = 'LIKE'
        ),
        'vetoCount', (
          select count(*) from public.t_lunch_room_vote vote
          where vote.room_id = v_room.id
            and vote.menu_id = menu.id
            and vote.vote_type = 'VETO'
        )
      ) order by menu.sort_order, menu.name)
      from public.t_menu menu
      where menu.id = any(v_room.menu_ids)
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_lunch_room_votes(
  p_code text,
  p_member_id uuid,
  p_token text,
  p_like_menu_ids uuid[],
  p_veto_menu_id uuid default null
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
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now());
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if v_room.status <> 'OPEN' then raise exception '투표가 마감되었습니다.'; end if;
  if not public.lunch_room_member_valid(v_room.id, p_member_id, p_token) then
    raise exception '참여자 인증에 실패했습니다.';
  end if;
  if coalesce(array_length(p_like_menu_ids, 1), 0) > 3 then
    raise exception '좋아요는 최대 3개까지 선택할 수 있습니다.';
  end if;
  if p_veto_menu_id = any(coalesce(p_like_menu_ids, '{}'::uuid[])) then
    raise exception '같은 메뉴를 좋아요와 제외로 동시에 선택할 수 없습니다.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_like_menu_ids, '{}'::uuid[])) id
    where not (id = any(v_room.menu_ids))
  ) or (p_veto_menu_id is not null and not (p_veto_menu_id = any(v_room.menu_ids))) then
    raise exception '방에 없는 메뉴가 포함되어 있습니다.';
  end if;

  delete from public.t_lunch_room_vote where member_id = p_member_id;

  insert into public.t_lunch_room_vote (room_id, member_id, menu_id, vote_type)
  select v_room.id, p_member_id, id, 'LIKE'
  from (
    select distinct id
    from unnest(coalesce(p_like_menu_ids, '{}'::uuid[])) id
  ) likes;

  if p_veto_menu_id is not null then
    insert into public.t_lunch_room_vote (room_id, member_id, menu_id, vote_type)
    values (v_room.id, p_member_id, p_veto_menu_id, 'VETO');
  end if;
end;
$$;

create or replace function public.close_lunch_room_voting(
  p_code text,
  p_member_id uuid,
  p_token text
)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.t_lunch_room;
  v_candidates uuid[];
begin
  select * into v_room from public.t_lunch_room
  where code = upper(trim(p_code)) and expires_at > timezone('utc', now())
  for update;
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if v_room.status <> 'OPEN' then raise exception '이미 투표가 마감되었습니다.'; end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 투표를 마감할 수 있습니다.'; end if;

  select array_agg(menu_id order by score desc, like_count desc, random())
    into v_candidates
  from (
    select menu_id,
      count(*) filter (where vote_type = 'LIKE') as like_count,
      count(*) filter (where vote_type = 'LIKE')
        - count(*) filter (where vote_type = 'VETO') * 2 as score
    from public.t_lunch_room_vote
    where room_id = v_room.id
    group by menu_id
    order by score desc, like_count desc, random()
    limit 3
  ) ranked;

  if coalesce(array_length(v_candidates, 1), 0) < 2 then
    select array_agg(id) into v_candidates
    from (
      select unnest(v_room.menu_ids) id order by random() limit 3
    ) fallback;
  end if;

  update public.t_lunch_room
  set status = 'VOTING_CLOSED', candidate_menu_ids = v_candidates
  where id = v_room.id;

  return v_candidates;
end;
$$;

create or replace function public.complete_lunch_room(
  p_code text,
  p_member_id uuid,
  p_token text,
  p_winner_menu_id uuid
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
  if not found then raise exception '유효한 점심방을 찾지 못했습니다.'; end if;
  if v_room.status <> 'VOTING_CLOSED' then
    raise exception '룰렛을 돌릴 수 있는 상태가 아닙니다.';
  end if;
  if not exists (
    select 1 from public.t_lunch_room_member
    where id = p_member_id and room_id = v_room.id and is_host
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception '방장만 결과를 확정할 수 있습니다.'; end if;
  if not (p_winner_menu_id = any(v_room.candidate_menu_ids)) then
    raise exception '최종 후보가 아닌 메뉴입니다.';
  end if;

  update public.t_lunch_room
  set status = 'COMPLETED', winner_menu_id = p_winner_menu_id
  where id = v_room.id;
end;
$$;

create trigger trg_audit_lunch_room
  after insert or update or delete on public.t_lunch_room
  for each row execute function public.write_audit_log('LUNCH_ROOM');

revoke all on function public.lunch_room_member_valid(uuid, uuid, text) from public;
revoke all on function public.create_lunch_room(uuid, text, text) from public;
revoke all on function public.join_lunch_room(text, text, text) from public;
revoke all on function public.get_lunch_room(text) from public;
revoke all on function public.save_lunch_room_votes(text, uuid, text, uuid[], uuid) from public;
revoke all on function public.close_lunch_room_voting(text, uuid, text) from public;
revoke all on function public.complete_lunch_room(text, uuid, text, uuid) from public;

grant execute on function public.create_lunch_room(uuid, text, text) to anon, authenticated;
grant execute on function public.join_lunch_room(text, text, text) to anon, authenticated;
grant execute on function public.get_lunch_room(text) to anon, authenticated;
grant execute on function public.save_lunch_room_votes(text, uuid, text, uuid[], uuid) to anon, authenticated;
grant execute on function public.close_lunch_room_voting(text, uuid, text) to anon, authenticated;
grant execute on function public.complete_lunch_room(text, uuid, text, uuid) to anon, authenticated;
