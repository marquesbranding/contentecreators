## 1. Company carousel: fix duplicate heading and add search

- [x] 1.1 `company-carousel-screen.client.tsx`: removed `CompanyCarouselScreenContent`'s own `<h2>Empresas na comunidade</h2>` + description paragraph (redundant with `CompanyCarouselView`'s own "Marcas para conhecer" heading). Section now labelled by the inner heading (`aria-labelledby="company-carousel-heading"`).
- [x] 1.2 Added `CompanyNameSearch`: a debounced (300ms) `Input` inside `InputGroup` next to `CompanySegmentFilter`, writing to the `companySearch` query param via the same `router.replace` pattern, placeholder "Buscar empresas por nome ou segmento".
- [x] 1.3 No existing test asserted the removed heading/DOM structure — full suite passed unchanged (1131/1131).

## 2. Creator detail page: reposition type badge

- [x] 2.1 `catalog-detail-view.tsx`: moved the creator-type Badge (and niche badges) to render immediately after the `<h1>{detail.displayName}</h1>`, not before it.
- [x] 2.2 No existing test asserted DOM order for the badge relative to the name — full suite passed unchanged.

## 3. Verification

- [x] 3.1 `npm run type-check` clean; full unit+component suite 1131/1131 passing.
- [x] 3.2 Live-verified in the browser: company carousel shows one heading ("Marcas para conhecer") + working name search (confirmed `?companySearch=` in the URL and zero-result filtering), creator detail page shows "Creator UGC" badge immediately after the `<h1>` name.
