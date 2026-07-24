# Architecture

## System overview

```text
React/Vite client
├─ Supabase JS → menus, menu types, exclusions, rooms, audit events
├─ Open-Meteo → weather used for team-menu weighting
└─ /api/places/* → server-side Google Places calls
                   └─ Supabase Storage → cached team-menu photos
```

The Vite application lives in `lunch-wheel/`. Vercel-compatible server functions
live under `lunch-wheel/api/`. Supabase schema changes are append-only migrations
under `lunch-wheel/supabase/migrations/`.

## Application layers

- `src/components/`: UI and user interactions.
- `src/hooks/`: stateful orchestration for menus, weather, nearby places, and rooms.
- `src/services/`: Supabase and HTTP access.
- `src/utils/`: deterministic wheel, weighting, date, sharing, and room helpers.
- `src/constants/`: shared configuration and icon mappings.

Components should not call Supabase directly. Data access belongs in services;
cross-component state and side effects belong in hooks; deterministic calculations
belong in utilities.

## Decision modes

### Team

Menus and types come from Supabase. Daily exclusions remove candidates. Weather
weights adjust the remaining menu probabilities immediately before a spin.

### Nearby

The browser supplies coordinates. Google Places is called only after an explicit
load or refresh action. Results are cached for 30 minutes and rating filtering is
local. Nearby candidates are equally weighted.

### Lunch room

Supabase stores the room, members, candidates, preferences, readiness, activity,
and shared spin state. Clients subscribe to room changes and render the same
winner and animation timing. The host controls closing and spinning.

## Security and privacy

- Google Places credentials stay in server-side environment variables.
- Browser-safe Supabase configuration uses the `VITE_` prefix.
- Current anonymous RLS is temporary and is a production-readiness blocker.
- Exact coordinates should not be persisted unless a documented feature requires it.
- Audit records must not include secrets or unnecessary personal data.

## Cost controls

- Nearby Places calls require an explicit user action.
- Nearby results are cached and spins do not trigger Places calls.
- Photo fields are omitted from nearby searches.
- Team-place photos are copied to Supabase Storage and refreshed periodically.

## Verification

- Static quality: `npm run lint`
- Production bundle: `npm run build`
- Browser flows: `npm run test:e2e`
