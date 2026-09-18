# Sponsorship creative options — validation

Implemented from `revisao_final_patrocinios.md` on 2026-09-18.

## Behavior

- The root metadata includes Meta domain verification on public and protected routes.
- One optional HTTP(S) destination powers independent creative and button links. Anchors are siblings; no nested links.
- Image-based placements activate without title, body or CTA. Alternative text falls back through image description, title, advertiser and “Patrocínio”.
- Public and catalog hero banners share the same responsive image layout with no gradient overlay.
- Appearance accepts only six-digit hex colors and five font keys. Extra Google fonts are self-hosted by Next, scoped to sponsorship wrappers and not preloaded.
- Sponsored disclosure defaults on; advertiser disclosure defaults off and requires a name when enabled.
- Sponsored cards occupy the catalog’s existing list at positions 9, 18, 27… and cycle through up to three creatives. App composition preserves feature boundaries. Carousel cards use the same shell and column widths.
- Mobile grid rows share a height so the single-column sponsored card matches adjacent profiles. Desktop/tablet retain the existing staggered layout.

## Database

`20260918120000_sponsorship_creative_options.sql` adds eight fields and six checks. Compatibility updates preserve existing creative clicks and advertiser labels without incrementing versions or timestamps. The generic audit trigger already captures new columns; RLS remains unchanged. Drizzle, admin writes, activation, delivery, the strict public allowlist and local fixtures reflect the new fields.

## Browser measurements

Actual `getBoundingClientRect()` measurements from Chromium with approved local fixtures:

| Viewport | Sponsored card | Neighbor profile | Difference |
| -------- | -------------- | ---------------- | ---------- |
| 1440 px  | 308 × 416 px   | 308 × 416 px     | 0 px       |
| 768 px   | 344 × 384 px   | 344 × 384 px     | 0 px       |
| 375 px   | 343 × 362 px   | 343 × 362 px     | 0 px       |

The 900 × 1200 recommendation approximates the desktop card’s measured 3:4 ratio. Actual dimensions depend on available catalog width and profile content; the shared grid controls sizing.

## Automated coverage and reproduction

- Unit: 1,028 tests passed.
- Component: 347 tests passed.
- Local integration: 137 tests passed, including schema drift, RLS, persisted options and invalid database writes.
- Production build, lint, TypeScript and formatting of all changed implementation files passed.
- Browser: 12/12 scenarios passed in the final full run across desktop/mobile Chromium and WebKit. The portrait crop dialog now keeps its footer visible while content scrolls.
- Browser spec: `e2e/sponsorships/placement-wizard.spec.ts` covers incomplete drafts, optional link validation, upload/crop, publication, saved appearance, disclosures, domain metadata, card measurements, carousel widths, independent links and responsive screenshots.

Run the full integration suite with `npm run test:integration:local` and its default reset. `local:reset` also provisions configured non-fixture administrators, so skipping the suite reset can violate its synthetic-only seed assertion. Run `local:env` and `local:storage` afterward before browser testing.

Use `PLAYWRIGHT_PORT=3010 npm run test:e2e -- e2e/sponsorships/placement-wizard.spec.ts --workers=1`; serial execution prevents test campaigns from competing for the same public slots.

Visual QA ran with `npm run dev` and with the production server at 1440, 768 and 375 pixels. Local screenshots are preserved under `.tmp-sponsorship-qa/`; the spec also creates them in Playwright’s output directory. All imagery/accounts are synthetic fixtures.

## Formatting baseline

The repository-wide `format:check` includes three pre-existing untracked briefs: `patrocinios_melhorado.md`, `revisao_03.md` and `revisao_final_patrocinios.md`. Their formatting is left intact. Changed implementation files are checked separately.
