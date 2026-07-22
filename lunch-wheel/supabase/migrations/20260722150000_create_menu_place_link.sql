-- Menu place links (Google Places first; kakao/other providers allowed later)
-- Temporary: anon role has open read/write for the no-auth MVP.

-- ---------------------------------------------------------------------------
-- t_menu_place_link
-- ---------------------------------------------------------------------------
create table if not exists public.t_menu_place_link (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  menu_id uuid not null references public.t_menu (id) on delete cascade,

  -- 'google' | 'kakao' | 'naver' | 'other'
  provider text not null default 'google',
  url text,
  place_id text,

  place_name text,
  formatted_address text,
  phone text,
  latitude double precision,
  longitude double precision,

  -- Cached place metadata (filled by Places API or manual entry)
  rating numeric(2, 1),
  rating_count integer,
  -- [{ "name": "places/.../photos/...", "widthPx": 1200, "heightPx": 900 }, ...]
  -- or resolved https URLs once generated
  photo_refs jsonb not null default '[]'::jsonb,
  photo_urls jsonb not null default '[]'::jsonb,

  fetch_status text not null default 'pending'
    check (fetch_status in ('pending', 'ok', 'failed', 'manual')),
  fetch_error text,
  fetched_at timestamptz,

  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint t_menu_place_link_provider_check
    check (provider in ('google', 'kakao', 'naver', 'other'))
);

-- Same menu + provider + place_id should not duplicate (when place_id present)
create unique index if not exists idx_t_menu_place_link_menu_provider_place
  on public.t_menu_place_link (menu_id, provider, place_id)
  where place_id is not null and is_active = true;

create index if not exists idx_t_menu_place_link_menu_active
  on public.t_menu_place_link (menu_id, sort_order)
  where is_active = true;

create index if not exists idx_t_menu_place_link_team_id
  on public.t_menu_place_link (team_id);

create index if not exists idx_t_menu_place_link_provider_place
  on public.t_menu_place_link (provider, place_id)
  where place_id is not null;

drop trigger if exists trg_t_menu_place_link_updated_at on public.t_menu_place_link;
create trigger trg_t_menu_place_link_updated_at
  before update on public.t_menu_place_link
  for each row
  execute function public.set_updated_at();

-- Ensure link.team_id matches menu.team_id
create or replace function public.enforce_place_link_team_matches_menu()
returns trigger
language plpgsql
as $$
declare
  menu_team_id uuid;
begin
  select team_id into menu_team_id
  from public.t_menu
  where id = new.menu_id;

  if menu_team_id is null then
    raise exception 'menu_id % does not exist', new.menu_id;
  end if;

  if menu_team_id <> new.team_id then
    raise exception 't_menu_place_link.team_id (%) must match t_menu.team_id (%)',
      new.team_id, menu_team_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_t_place_link_team_match on public.t_menu_place_link;
create trigger trg_t_place_link_team_match
  before insert or update of team_id, menu_id
  on public.t_menu_place_link
  for each row
  execute function public.enforce_place_link_team_matches_menu();

-- ---------------------------------------------------------------------------
-- RLS (TEMPORARY anon policies — same as other lunch-wheel tables)
-- ---------------------------------------------------------------------------
alter table public.t_menu_place_link enable row level security;

drop policy if exists t_menu_place_link_anon_select on public.t_menu_place_link;
drop policy if exists t_menu_place_link_anon_insert on public.t_menu_place_link;
drop policy if exists t_menu_place_link_anon_update on public.t_menu_place_link;
drop policy if exists t_menu_place_link_anon_delete on public.t_menu_place_link;

create policy t_menu_place_link_anon_select on public.t_menu_place_link
  for select to anon using (true);
create policy t_menu_place_link_anon_insert on public.t_menu_place_link
  for insert to anon with check (true);
create policy t_menu_place_link_anon_update on public.t_menu_place_link
  for update to anon using (true) with check (true);
create policy t_menu_place_link_anon_delete on public.t_menu_place_link
  for delete to anon using (true);

-- Future Auth placeholders (commented):
-- create policy t_menu_place_link_authenticated_select on public.t_menu_place_link
--   for select to authenticated using (true);

grant select, insert, update, delete on public.t_menu_place_link to anon, authenticated;
