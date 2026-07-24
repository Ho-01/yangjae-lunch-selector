# ADR 0002: Explicit and cached Google Places usage

- Status: Accepted
- Date: 2026-07-22

## Context

Nearby restaurants and place photos improve decisions, but uncontrolled Places
requests create cost and quota risk.

## Decision

Route Places requests through server functions. Require explicit nearby load and
refresh actions, cache nearby results for 30 minutes, omit nearby photos, and keep
rating filtering local. Cache linked team-menu photos in Supabase Storage.

## Consequences

Some information can be stale for a short period and refresh is user-driven. The
cost model stays observable and spinning never creates an unexpected Places call.
