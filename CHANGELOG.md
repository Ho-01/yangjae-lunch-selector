# Changelog

All notable user-visible changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Repository UX checklist and keyboard-accessibility baseline.
- Product, architecture, roadmap, release, and agent workflow documentation.
- Browser end-to-end test foundation for core desktop and mobile flows.
- Supabase deployment preflight, dry-run, status reporting, and one-time history repair.

### Changed

- Mode controls now expose their toggle state with appropriate accessibility semantics.
- Loading, error, and toast messages provide assistive-technology status feedback.
- Public product naming is standardized as `점심룰렛`.

## [0.1.0] - 2026-07-24

### Added

- Weather-weighted team menu wheel with daily exclusions.
- Menu and menu-type management with configurable weather weights.
- Google Places links, ratings, photos, and Supabase Storage photo caching.
- Nearby restaurant mode using browser location, rating filters, and a 30-minute cache.
- Collaborative lunch rooms with candidate creation, likes, vetoes, readiness, and host-controlled spins.
- Synchronized room wheel animation, activity history, nudges, editable nicknames, and result sharing.
- Responsive mobile layouts and Supabase audit logging.

### Fixed

- Clear nearby-search failure messages and separate location lookup from Places calls.
- Linux/Vercel build reproducibility and Supabase migration compatibility.
- Lunch-room mode isolation, room status labels, and synchronized spin preservation.

[Unreleased]: https://github.com/Ho-01/yangjae-lunch-selector/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Ho-01/yangjae-lunch-selector/releases/tag/v0.1.0
