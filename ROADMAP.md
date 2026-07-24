# Product roadmap

The roadmap is ordered by user value and risk reduction. Items may move as usage
evidence changes. `Now` is committed next work; `Next` is planned; `Later` is exploratory.

## Now — M0 foundation (`0.1.x`)

- [x] Document current product capabilities and architecture.
- [x] Establish agent, changelog, release, and UX rules.
- [x] Add lint and production-build CI.
- [x] Add Playwright coverage for core desktop and mobile flows.
- [x] Connect the repository to the final GitHub URL in changelog links.
- [x] Establish the initial public product name as `점심룰렛`.

## Completed — M1 UX reliability (`0.2.0`)

- [x] Add confirmation or undo for destructive actions and vote closing.
- [x] Explain why unavailable nearby actions are disabled.
- [x] Provide recovery paths for denied location permission and network failures.
- [x] Collapse secondary mobile panels without hiding the primary decision flow.
- [x] Standardize loading, empty, success, and error states on primary data surfaces.
- [x] Separate restaurant search from direct name entry so users always understand
  which source will be added. Use explicit tabs or sections, distinct labels, and
  source-specific empty/error states.
- [x] Complete automated keyboard and 320/390/desktop browser checks.

## Completed — M2 decision quality (`0.3.0`)

- [x] Rebrand the public product from `점심룰렛` to `식사가챠` across the app shell,
  metadata, share cards, documentation, and deployment-facing copy while preserving
  existing local-storage keys and data compatibility.
- [x] Support a randomized result-message pool while keeping the selected menu prominent
  and accessible. Initial tone examples:
  - `🎉 축하합니다! 오늘의 희생 메뉴는 '{메뉴}'입니다.`
  - `🍜 운명이 {메뉴}를 선택했습니다. 항의는 받지 않습니다.`
  - `😎 룰렛이 책임집니다. 맛있게 드세요.`
  - `💀 다시 돌리기? 그건 비겁한 선택입니다.`
  - `🔥 오늘의 점심은 이미 정해져 있었다.`
- [x] Define message variants that include the selected menu, avoid
  repeating the same line consecutively, and preserve a reduced-motion/plain-copy
  fallback where needed.
- [x] Record up to 10 recent results in the current browser.
- [x] Optionally reduce the three most recently selected menus to `0.55×`.
- [x] Let users reset history and show adjusted menus in the probability list.
- [x] Keep history local with menu ID/name, mode, and time only; do not sync remotely
  until authentication, retention, and privacy requirements are defined.

## Next — M3 collaborative rooms (`0.4.0`)

- Restore active rooms after refresh or browser restart using the existing member
  session, and clearly distinguish re-entry from joining as a new member.
- Add a `내 방` list for active/recent rooms, showing room name or code, status,
  member count, last activity, expiration, and an explicit `다시 들어가기` action.
- Add lightweight room chat with realtime delivery, timestamps, sender identity,
  empty/loading/error states, message length limits, and room-expiration handling.
- Keep chat visually separate from restaurant search and direct candidate-name entry
  so messages can never be mistaken for candidate additions.
- Define retention, abuse controls, and RLS rules before persisting chat messages.
- Improve expired-room recovery and explain when a room can no longer be re-entered.
- Support host transfer and clearer member identity.
- Add dietary restrictions and allergies without exposing sensitive details unnecessarily.
- Explain how likes and vetoes affected the final candidate list.

## Later — M4 restaurant context (`0.5.0`)

- Let nearby users narrow or add restaurants by food category, starting with
  `한식`, `중식`, `일식`, and `양식`.
- Define category behavior for single/multiple selection, uncategorized restaurants,
  and manual overrides when Google Places categories are ambiguous.
- Prefer local filtering of already loaded results; only make another Places request
  when the selected category cannot be satisfied locally, and explain the API/cost
  impact before refreshing.
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
