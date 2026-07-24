# ADR 0001: Supabase as the shared backend

- Status: Accepted
- Date: 2026-07-22

## Context

Menus, daily exclusions, collaborative rooms, realtime updates, audit events, and
cached photos require shared persistence with minimal backend infrastructure.

## Decision

Use Supabase PostgreSQL, Realtime, Storage, and RLS. Schema changes are append-only
SQL migrations. Browser clients use a publishable key; privileged credentials are
never exposed to Vite.

## Consequences

Realtime group behavior is straightforward and operations stay compact. Anonymous
RLS is acceptable only during the prototype phase; authentication and membership
policies remain mandatory before `1.0.0`.
