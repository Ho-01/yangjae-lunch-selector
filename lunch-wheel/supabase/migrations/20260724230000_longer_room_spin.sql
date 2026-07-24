-- Keep synchronized room spins aligned with the longer suspenseful slowdown.

alter table public.t_lunch_room
  alter column spin_duration_ms set default 5400;

update public.t_lunch_room
set spin_duration_ms = 5400
where status in ('OPEN', 'VOTING_CLOSED')
  and spin_duration_ms = 4300;
