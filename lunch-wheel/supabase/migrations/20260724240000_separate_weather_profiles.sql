-- Separate probability behavior from food/cuisine categories.
-- IDs are preserved so the legacy menu_type_id and the new weather_profile_id
-- can coexist during the additive rollout.

create table if not exists public.t_weather_profile (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.t_team (id) on delete cascade,
  code text not null,
  name text not null,
  icon_key text not null,
  color text not null,
  weight_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint t_weather_profile_team_code_unique unique (team_id, code)
);

create index if not exists idx_t_weather_profile_team_active
  on public.t_weather_profile (team_id, sort_order)
  where is_active = true;

drop trigger if exists trg_t_weather_profile_updated_at on public.t_weather_profile;
create trigger trg_t_weather_profile_updated_at
  before update on public.t_weather_profile
  for each row
  execute function public.set_updated_at();

insert into public.t_weather_profile (
  id,
  team_id,
  code,
  name,
  icon_key,
  color,
  weight_config,
  is_active,
  sort_order,
  created_at,
  updated_at
)
select
  id,
  team_id,
  code,
  name,
  icon_key,
  color,
  weather_weight_config,
  is_active,
  sort_order,
  created_at,
  updated_at
from public.t_menu_type
on conflict (id) do update set
  team_id = excluded.team_id,
  code = excluded.code,
  name = excluded.name,
  icon_key = excluded.icon_key,
  color = excluded.color,
  weight_config = excluded.weight_config,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;

alter table public.t_menu
  add column if not exists weather_profile_id uuid;

update public.t_menu
set weather_profile_id = menu_type_id
where weather_profile_id is null;

alter table public.t_menu
  drop constraint if exists t_menu_weather_profile_id_fkey;
alter table public.t_menu
  add constraint t_menu_weather_profile_id_fkey
  foreign key (weather_profile_id)
  references public.t_weather_profile (id)
  on delete restrict;

alter table public.t_menu
  alter column weather_profile_id set not null;

create index if not exists idx_t_menu_weather_profile_id
  on public.t_menu (weather_profile_id);

create or replace function public.sync_menu_type_to_weather_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.t_weather_profile (
    id,
    team_id,
    code,
    name,
    icon_key,
    color,
    weight_config,
    is_active,
    sort_order,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.team_id,
    new.code,
    new.name,
    new.icon_key,
    new.color,
    new.weather_weight_config,
    new.is_active,
    new.sort_order,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    code = excluded.code,
    name = excluded.name,
    icon_key = excluded.icon_key,
    color = excluded.color,
    weight_config = excluded.weight_config,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists trg_sync_menu_type_to_weather_profile on public.t_menu_type;
create trigger trg_sync_menu_type_to_weather_profile
  after insert or update on public.t_menu_type
  for each row
  execute function public.sync_menu_type_to_weather_profile();

create or replace function public.sync_menu_weather_profile_reference()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
    or new.weather_profile_id is null
    or new.menu_type_id is distinct from old.menu_type_id
  then
    new.weather_profile_id := new.menu_type_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_menu_weather_profile_reference on public.t_menu;
create trigger trg_sync_menu_weather_profile_reference
  before insert or update of menu_type_id on public.t_menu
  for each row
  execute function public.sync_menu_weather_profile_reference();

alter table public.t_weather_profile enable row level security;

drop policy if exists t_weather_profile_anon_select on public.t_weather_profile;
drop policy if exists t_weather_profile_anon_insert on public.t_weather_profile;
drop policy if exists t_weather_profile_anon_update on public.t_weather_profile;
drop policy if exists t_weather_profile_anon_delete on public.t_weather_profile;

create policy t_weather_profile_anon_select on public.t_weather_profile
  for select to anon, authenticated using (true);

grant select on public.t_weather_profile to anon, authenticated;
