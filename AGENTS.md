# Repository instructions

These instructions apply to the entire repository.

## Product principles

- Optimize for making a lunch decision quickly and confidently.
- Keep the primary flow obvious: choose a mode, review candidates, spin, understand the result.
- Do not add settings or technical detail to the primary flow unless they change the user's decision.
- Follow `lunch-wheel/UX_CHECKLIST.md` for UI work.

## Required checks

Run from `lunch-wheel/` after code changes:

```bash
npm run lint
npm run build
```

Run `npm run test:e2e` when changing user flows, layout, accessibility, routing,
browser APIs, or dialogs. If a check cannot run, record the reason in the handoff.

## Documentation

- User-visible behavior: update `CHANGELOG.md` under `Unreleased`.
- Product scope or priority: update `ROADMAP.md`.
- Setup, scripts, or environment variables: update `lunch-wheel/README.md`.
- Architecture or data-flow changes: update `docs/ARCHITECTURE.md`.
- A durable technical decision: add an ADR under `docs/decisions/`.

Do not maintain a separate development diary. Commits and pull requests preserve
implementation history; `CHANGELOG.md` preserves user-visible history.

## Database and secrets

- Never edit an already deployed Supabase migration. Add a new migration.
- Never expose service-role keys, database passwords, or Google Places keys to Vite.
- Only browser-safe values may use the `VITE_` prefix.
- Preserve the cost controls documented for Google Places.

## Git and releases

- Use Conventional Commits: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`.
- Keep changes focused and do not overwrite unrelated user edits.
- Use Semantic Versioning while the product is pre-1.0.
- Follow `docs/RELEASE.md` for releases.

## Definition of done

- The requested behavior works and failure/empty/loading states are handled.
- Relevant checks pass.
- No horizontal overflow at 320px for UI changes.
- Keyboard focus remains visible and primary controls are at least 44px on mobile.
- Required documentation is updated in the same change.
