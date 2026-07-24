# Release process

The project uses Semantic Versioning and Conventional Commits.

## Version policy

- Patch (`0.1.1`): compatible bug fixes and small UX corrections.
- Minor (`0.2.0`): user-visible features while pre-1.0.
- Major (`1.0.0`): production-ready security, data, and operational contract.

## Prepare

1. Move relevant `CHANGELOG.md` entries from `Unreleased` into a dated version.
2. Update `lunch-wheel/package.json` and its lockfile.
3. Confirm setup and environment documentation.
4. Run from `lunch-wheel/`:

```bash
npm run lint
npm run build
npm run test:e2e
```

5. Review migrations, secrets, and API-cost changes separately.

## Database migration deployment

Production migrations are applied by `.github/workflows/deploy-supabase.yml`
whenever a committed file under `lunch-wheel/supabase/migrations/` reaches `main`.
The workflow validates its three required secrets, links the production project,
shows remote migration status, performs a dry run, and then pushes.

Required GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID` (`cipkaybwqdgevzhdguaq`)

Do not paste migration SQL into the production SQL Editor during the normal release
flow. If an emergency manual change is unavoidable, reconcile
`supabase_migrations.schema_migrations` before the next automated deployment.

The workflow has a one-time manual option named
`repair_manually_applied_room_migrations`. It exists only to reconcile the verified
2026-07-23/24 room migrations that were previously applied through SQL Editor.
Do not use it for future migrations.

## Publish

```bash
git add .
git commit -m "chore(release): 0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push origin main
git push origin v0.2.0
```

Create a GitHub Release from the matching changelog section. Do not create or push
a tag until all required checks pass and the release contents are approved.

## Hotfix

Patch from the current `main`, add a regression test when practical, update the
changelog, bump the patch version, and follow the same verification steps.

## Rollback

- Frontend: redeploy the last known-good Vercel deployment.
- Database: prefer a forward corrective migration; do not edit deployed migrations.
- Document the incident and corrective decision under `docs/decisions/` when it
  changes a durable system rule.
