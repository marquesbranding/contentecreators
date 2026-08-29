## Context

Post-merge re-audit of the review doc against current code. Three small, independent UI fixes; no data model or API changes required.

## Goals / Non-Goals

**Goals:**
- Remove the duplicate company-carousel heading.
- Let users search companies by name (the query param already exists server-side).
- Move the creator-type badge below the display name on the creator detail page.

**Non-Goals:**
- Catalog card views/interactions metrics — already implemented, no work needed.
- Footer social links — blocked on real URLs, not implemented here.
- Any change to the onboarding social-channels table.

## Decisions

- **Duplicate heading**: delete `CompanyCarouselScreenContent`'s own `<h2>`/description block entirely rather than deleting `CompanyCarouselView`'s, since the latter already carries the doc-approved copy ("Marcas para conhecer" + the exact reviewed paragraph). Keep the segment filter and the new search input positioned where the old heading row was, right-aligned above the list.
- **Search input**: a plain debounced text `Input` (not a new component) that writes to the `companySearch` query param via the same `router.replace` pattern already used by `CompanySegmentFilter`, so both filters compose naturally through the existing `CompanyCarouselQueryFilters`. Debounce ~300ms to avoid a request per keystroke.
- **Badge reposition**: move the `<Badge>`/niches block in `catalog-detail-view.tsx` to render immediately after the `<h1>` name instead of before it. Keep niche badges grouped with the type badge (same doc example just shows the type tag; keeping niches alongside is a reasonable continuation of the existing pattern, not a new layout).

## Risks / Trade-offs

- [Search input adds a network request on every debounced keystroke] → Mitigation: reuse the existing React Query hook's caching; 300ms debounce keeps it well within normal typing pauses.
- [Reordering the badge could shift the detail page's visual rhythm slightly] → Mitigation: manual visual check after the change (no visual regression tooling in this repo).
