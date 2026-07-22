-- Append-only audit trail for domain data changes.
-- Writes are performed only by database triggers; clients have no direct access.

create table if not exists public.t_audit_log (
  id bigint generated always as identity primary key,
  team_id uuid,
  actor_user_id uuid,
  actor_session_id text,
  actor_role text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  changed_fields text[] not null default '{}'::text[],
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  transaction_id bigint not null default txid_current(),
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_t_audit_log_occurred_at
  on public.t_audit_log (occurred_at desc);

create index if not exists idx_t_audit_log_team_occurred_at
  on public.t_audit_log (team_id, occurred_at desc);

create index if not exists idx_t_audit_log_entity
  on public.t_audit_log (entity_type, entity_id, occurred_at desc);

create index if not exists idx_t_audit_log_actor_user
  on public.t_audit_log (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

create index if not exists idx_t_audit_log_actor_session
  on public.t_audit_log (actor_session_id, occurred_at desc)
  where actor_session_id is not null;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_data jsonb;
  new_data jsonb;
  request_headers jsonb := '{}'::jsonb;
  audit_team_id uuid;
  audit_entity_id uuid;
  audit_changed_fields text[] := '{}'::text[];
begin
  if tg_op <> 'INSERT' then
    old_data := to_jsonb(old) - 'updated_at';
  end if;

  if tg_op <> 'DELETE' then
    new_data := to_jsonb(new) - 'updated_at';
  end if;

  -- Place photo/cache refreshes are operational noise, not user changes.
  if tg_table_name = 't_menu_place_link' then
    old_data := old_data - array[
      'photo_refs', 'photo_urls', 'fetch_status', 'fetch_error', 'fetched_at'
    ];
    new_data := new_data - array[
      'photo_refs', 'photo_urls', 'fetch_status', 'fetch_error', 'fetched_at'
    ];
  end if;

  if tg_op = 'UPDATE' and old_data = new_data then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}'::text[])
      into audit_changed_fields
    from (
      select key from jsonb_object_keys(old_data) as key
      union
      select key from jsonb_object_keys(new_data) as key
    ) keys
    where old_data -> key is distinct from new_data -> key;
  end if;

  begin
    request_headers := coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb,
      '{}'::jsonb
    );
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  audit_team_id := nullif(
    coalesce(
      new_data ->> 'team_id',
      old_data ->> 'team_id',
      case when tg_table_name = 't_team' then new_data ->> 'id' end,
      case when tg_table_name = 't_team' then old_data ->> 'id' end
    ),
    ''
  )::uuid;
  audit_entity_id := nullif(
    coalesce(new_data ->> 'id', old_data ->> 'id'),
    ''
  )::uuid;

  insert into public.t_audit_log (
    team_id,
    actor_user_id,
    actor_session_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    changed_fields,
    request_id,
    metadata
  ) values (
    audit_team_id,
    auth.uid(),
    nullif(request_headers ->> 'x-client-id', ''),
    auth.role(),
    tg_op,
    tg_argv[0],
    audit_entity_id,
    old_data,
    new_data,
    audit_changed_fields,
    nullif(request_headers ->> 'x-request-id', ''),
    jsonb_build_object('source_table', tg_table_name)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_team on public.t_team;
create trigger trg_audit_team
  after insert or update or delete on public.t_team
  for each row execute function public.write_audit_log('TEAM');

drop trigger if exists trg_audit_menu_type on public.t_menu_type;
create trigger trg_audit_menu_type
  after insert or update or delete on public.t_menu_type
  for each row execute function public.write_audit_log('MENU_TYPE');

drop trigger if exists trg_audit_menu on public.t_menu;
create trigger trg_audit_menu
  after insert or update or delete on public.t_menu
  for each row execute function public.write_audit_log('MENU');

drop trigger if exists trg_audit_menu_place_link on public.t_menu_place_link;
create trigger trg_audit_menu_place_link
  after insert or update or delete on public.t_menu_place_link
  for each row execute function public.write_audit_log('MENU_PLACE_LINK');

drop trigger if exists trg_audit_daily_menu_exclusion on public.t_daily_menu_exclusion;
create trigger trg_audit_daily_menu_exclusion
  after insert or update or delete on public.t_daily_menu_exclusion
  for each row execute function public.write_audit_log('DAILY_MENU_EXCLUSION');

alter table public.t_audit_log enable row level security;

-- Deliberately no anon/authenticated policies. Audit data must be read through
-- a trusted admin API (service role) or a future administrator-only policy.
revoke all on public.t_audit_log from anon, authenticated;
revoke all on sequence public.t_audit_log_id_seq from anon, authenticated;
