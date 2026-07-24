# Product roadmap

The roadmap is ordered by user value and risk reduction. Items may move as usage
evidence changes. `Now` is committed next work; `Next` is planned; `Later` is exploratory.

## Now — M0 foundation (`0.1.x`)

- [x] Document current product capabilities and architecture.
- [x] Establish agent, changelog, release, and UX rules.
- [x] Add lint and production-build CI.
- [x] Add Playwright coverage for core desktop and mobile flows.
- [x] Connect the repository to the final GitHub URL in changelog links.
- [x] Standardize the public product name as `점심룰렛`.

## Next — M1 UX reliability (`0.2.0`)

- Add confirmation or undo for destructive actions and vote closing.
- Explain why unavailable actions are disabled.
- Provide recovery paths for denied location permission and network failures.
- Collapse secondary mobile panels without hiding the primary decision flow.
- Standardize loading, empty, success, and error states.
- Complete keyboard and 320/390/768px browser checks.

## Next — M2 decision quality (`0.3.0`)

- Record recent results.
- Optionally reduce or exclude recently selected menus.
- Let users reset history and understand why a menu's chance changed.
- Define retention and privacy rules before storing history remotely.

## Later — M3 collaborative rooms (`0.4.0`)

- Improve reconnect and expired-room recovery.
- Support host transfer and clearer member identity.
- Add dietary restrictions and allergies without exposing sensitive details unnecessarily.
- Explain how likes and vetoes affected the final candidate list.

## Later — M4 restaurant context (`0.5.0`)

- Show distance or walking-time context.
- Evaluate open-now and price information against Places cost and freshness.
- Improve map handoff while retaining explicit API-call controls.

## Later — M5 production readiness (`1.0.0`)

- Add Supabase Auth, teams, memberships, and restrictive RLS.
- Add application error monitoring and operational alerts.
- Document backup, recovery, data retention, and location privacy.
- Complete performance, security, and accessibility release audits.

## Not planned without evidence

- Social feeds, public profiles, badges, or broad gamification.
- Complex personalization settings before recent-result behavior is validated.
- Automatic high-frequency Places refreshes that weaken cost controls.
