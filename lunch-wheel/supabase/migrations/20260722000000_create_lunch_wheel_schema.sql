-- Lunch wheel schema
-- Temporary: anon role has open read/write for the no-auth MVP.
-- Replace these policies with authenticated/team-scoped rules when Auth is added.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- t_team
-- ---------------------------------------------------------------------------
create table if not exists public.t_team (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  location_name text not null,
  weather_latitude double precision not null,
  weather_longitude double precision not null,
  timezone text not null default 'Asia/Seoul',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint t_team_slug_unique unique (slug)
);

create index if not exists idx_t_team_active_slug
  on public.t_team (slug)
  where is_active = true;

drop trigger if exists trg_t_team_updated_at on public.t_team;
create trigger trg_t_team_updated_at
  before update on public.t_team
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- t_menu_type
-- ---------------------------------------------------------------------------
create table if not exists public.t_menu_type (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  code text not null,
  name text not null,
  icon_key text not null,
  color text not null,
  weather_weight_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint t_menu_type_team_code_unique unique (team_id, code)
);

create index if not exists idx_t_menu_type_team_active
  on public.t_menu_type (team_id, sort_order)
  where is_active = true;

drop trigger if exists trg_t_menu_type_updated_at on public.t_menu_type;
create trigger trg_t_menu_type_updated_at
  before update on public.t_menu_type
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- t_menu
-- ---------------------------------------------------------------------------
create table if not exists public.t_menu (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  menu_type_id uuid not null references public.t_menu_type (id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_t_menu_team_active_name_unique
  on public.t_menu (team_id, lower(name))
  where is_active = true;

create index if not exists idx_t_menu_team_active_sort
  on public.t_menu (team_id, sort_order)
  where is_active = true;

create index if not exists idx_t_menu_menu_type_id
  on public.t_menu (menu_type_id);

drop trigger if exists trg_t_menu_updated_at on public.t_menu;
create trigger trg_t_menu_updated_at
  before update on public.t_menu
  for each row
  execute function public.set_updated_at();

-- Ensure menu.team_id matches menu_type.team_id
create or replace function public.enforce_menu_team_matches_type()
returns trigger
language plpgsql
as $$
declare
  type_team_id uuid;
begin
  select team_id into type_team_id
  from public.t_menu_type
  where id = new.menu_type_id;

  if type_team_id is null then
    raise exception 'menu_type_id % does not exist', new.menu_type_id;
  end if;

  if type_team_id <> new.team_id then
    raise exception 't_menu.team_id (%) must match t_menu_type.team_id (%)',
      new.team_id, type_team_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_t_menu_team_match on public.t_menu;
create trigger trg_t_menu_team_match
  before insert or update of team_id, menu_type_id
  on public.t_menu
  for each row
  execute function public.enforce_menu_team_matches_type();

-- ---------------------------------------------------------------------------
-- t_daily_menu_exclusion
-- ---------------------------------------------------------------------------
create table if not exists public.t_daily_menu_exclusion (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  menu_id uuid not null references public.t_menu (id) on delete cascade,
  exclusion_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint t_daily_menu_exclusion_unique unique (team_id, menu_id, exclusion_date)
);

create index if not exists idx_t_daily_menu_exclusion_team_date
  on public.t_daily_menu_exclusion (team_id, exclusion_date);

create index if not exists idx_t_daily_menu_exclusion_menu_id
  on public.t_daily_menu_exclusion (menu_id);

-- Ensure exclusion.team_id matches menu.team_id
create or replace function public.enforce_exclusion_team_matches_menu()
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
    raise exception 't_daily_menu_exclusion.team_id (%) must match t_menu.team_id (%)',
      new.team_id, menu_team_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_t_exclusion_team_match on public.t_daily_menu_exclusion;
create trigger trg_t_exclusion_team_match
  before insert or update of team_id, menu_id
  on public.t_daily_menu_exclusion
  for each row
  execute function public.enforce_exclusion_team_matches_menu();

-- ---------------------------------------------------------------------------
-- RLS
-- TEMPORARY anon policies for the no-login MVP.
-- When Supabase Auth is introduced, replace these with authenticated /
-- team-membership scoped policies (e.g. *_authenticated_* names below).
-- ---------------------------------------------------------------------------
alter table public.t_team enable row level security;
alter table public.t_menu_type enable row level security;
alter table public.t_menu enable row level security;
alter table public.t_daily_menu_exclusion enable row level security;

-- t_team
drop policy if exists t_team_anon_select on public.t_team;
drop policy if exists t_team_anon_insert on public.t_team;
drop policy if exists t_team_anon_update on public.t_team;
drop policy if exists t_team_anon_delete on public.t_team;

create policy t_team_anon_select on public.t_team
  for select to anon using (true);
create policy t_team_anon_insert on public.t_team
  for insert to anon with check (true);
create policy t_team_anon_update on public.t_team
  for update to anon using (true) with check (true);
create policy t_team_anon_delete on public.t_team
  for delete to anon using (true);

-- Future Auth placeholders (commented):
-- create policy t_team_authenticated_select on public.t_team
--   for select to authenticated using (true);

-- t_menu_type
drop policy if exists t_menu_type_anon_select on public.t_menu_type;
drop policy if exists t_menu_type_anon_insert on public.t_menu_type;
drop policy if exists t_menu_type_anon_update on public.t_menu_type;
drop policy if exists t_menu_type_anon_delete on public.t_menu_type;

create policy t_menu_type_anon_select on public.t_menu_type
  for select to anon using (true);
create policy t_menu_type_anon_insert on public.t_menu_type
  for insert to anon with check (true);
create policy t_menu_type_anon_update on public.t_menu_type
  for update to anon using (true) with check (true);
create policy t_menu_type_anon_delete on public.t_menu_type
  for delete to anon using (true);

-- t_menu
drop policy if exists t_menu_anon_select on public.t_menu;
drop policy if exists t_menu_anon_insert on public.t_menu;
drop policy if exists t_menu_anon_update on public.t_menu;
drop policy if exists t_menu_anon_delete on public.t_menu;

create policy t_menu_anon_select on public.t_menu
  for select to anon using (true);
create policy t_menu_anon_insert on public.t_menu
  for insert to anon with check (true);
create policy t_menu_anon_update on public.t_menu
  for update to anon using (true) with check (true);
create policy t_menu_anon_delete on public.t_menu
  for delete to anon using (true);

-- t_daily_menu_exclusion
drop policy if exists t_daily_menu_exclusion_anon_select on public.t_daily_menu_exclusion;
drop policy if exists t_daily_menu_exclusion_anon_insert on public.t_daily_menu_exclusion;
drop policy if exists t_daily_menu_exclusion_anon_update on public.t_daily_menu_exclusion;
drop policy if exists t_daily_menu_exclusion_anon_delete on public.t_daily_menu_exclusion;

create policy t_daily_menu_exclusion_anon_select on public.t_daily_menu_exclusion
  for select to anon using (true);
create policy t_daily_menu_exclusion_anon_insert on public.t_daily_menu_exclusion
  for insert to anon with check (true);
create policy t_daily_menu_exclusion_anon_update on public.t_daily_menu_exclusion
  for update to anon using (true) with check (true);
create policy t_daily_menu_exclusion_anon_delete on public.t_daily_menu_exclusion
  for delete to anon using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.t_team to anon, authenticated;
grant select, insert, update, delete on public.t_menu_type to anon, authenticated;
grant select, insert, update, delete on public.t_menu to anon, authenticated;
grant select, insert, update, delete on public.t_daily_menu_exclusion to anon, authenticated;
