# Sponsorship carousels, featured row and Jornada badge — UI patterns

Implemented from client review R04 (`openspec/changes/apply-client-review-r04`) and validated in Chromium on 2026-10-13 at 375, 768 and 1440 px. The product ships a light theme only: there is no `.dark` toggle and no `prefers-color-scheme` rule, so there is no dark variant to check.

## Landing banner rotator (`landing-top`)

- `SponsorshipHeroRotator` (`src/features/sponsorships/components/sponsorship-hero-rotator.client.tsx`) renders up to five full-width banners in one grid cell, so the region keeps the banners' height. Only the active slide is exposed to assistive technology (`aria-hidden`, `inert`) and to the tab order.
- A single banner never reaches the rotator: callers render `SponsorshipHeroBanner` directly, so the page looks exactly as before.
- Timing: 6 s per banner, 300 ms crossfade (`motion-safe:` only). Images after the first are `loading="lazy"`.
- Region: `role="region"`, `aria-label="Banners patrocinados"`, `aria-roledescription="carrossel"`; each slide is a `group` with `aria-roledescription="slide"` and a label such as "Banner 2 de 5".
- Controls (`SponsorshipCarouselControls`): a pause/resume button plus one indicator per banner. Indicators are 10 px dots with a 24 px hit area; the active one is a 24 px pill with `aria-current="true"`.
- The pause button is 44 px below the `lg` breakpoint and 28 px from `lg` up. The responsive route audit fails touch targets under 44 px on phones and tablets, and a 28 px button did fail it.
- Autoplay pauses on hover, keyboard focus, hidden tab and manual pause. With `prefers-reduced-motion` there is no autoplay, no crossfade and no pause button, and the indicators are the only way to change banner. All of this lives in `useAutoAdvance` (`src/shared/hooks/use-auto-advance.ts`), shared with the featured row.
- Data: `GET /api/public/sponsorships/landing` returns a list. The client still accepts the old `null | object` shape during the CDN cache window.

## Featured creators row (`catalog-featured`)

- `SponsorshipFeaturedCreatorsRow` shows up to ten creators side by side: 1, 2, 3 or 4 per row by breakpoint (`basis-full`, `sm`, `lg`, `xl`). One creator keeps the previous single card.
- While every card fits, the row is static: no motion, no indicators, no `aria-roledescription`. Overflow is measured on the client with a `ResizeObserver`; the server render and the first client render are always the static layout.
- Once it overflows, it advances one card every 5 s and wraps to the start, with the same pause rules and indicators as the banner rotator. Under reduced motion it never advances by itself but stays scrollable by touch, wheel and keyboard.
- The scroller `ul` is `relative`. Without it, absolutely positioned content inside the cards (sr-only text, stretched links) escapes the `overflow-x-auto` clip and widens the whole page; at 390 px the catalog scrolled sideways to about 1460 px. `e2e/acceptance/client-review-r04.spec.ts` keeps a regression check for this.

## Sponsored cards in the listing (`catalog-midlist`)

- Up to eight creatives, shuffled with Fisher–Yates and `crypto.randomInt` on each access, appear as a card after every 8th profile (positions 9, 18, 27…). They cycle A, B, C, A, B… across the accumulated pages, and a list shorter than the number of positions starts over from the first card. The earlier cycle of three creatives no longer applies.

## Jornada do Influenciador badge

- Component: `InfluencerJourneyBadge` (`src/shared/components/influencer-journey-badge.tsx`), built like `CdlMemberBadge`. It is a pill with a fixed white background and a 1 px `ring-black/10`, because the client's wordmark is blue (#0021A5) and must stay legible on any surface.
- The logo is a two-line wordmark (1685×403 px). At the first sizes tried, 14 and 16 px, the lines came out about 6 px tall and unreadable in the screenshots. Final sizes: `sm` = 20 px (`h-5`) on catalog cards, `md` = 24 px (`h-6`) on detail pages and the "Meu perfil" header. The checkbox in the profile form uses 20 px.
- Placement: right after the CDL badge. Alt text "Jornada do Influenciador", tooltip "Participante da Jornada do Influenciador". The fallback considered if the logo had stayed illegible, an emblem plus the word "Jornada", was not needed.
- Where it appears: creator and company cards, both detail pages, the "Meu perfil" header preview. The two detail pages and the form also show `InfluencerJourneyNote` (asterisked text plus a `target="_blank" rel="noopener noreferrer"` link to www.jornadadoinfluenciador.com.br).
- Form: a controlled checkbox plus a hidden input, the same technique as the CDL one. "Selos" in the filter dialog filters by it (`jornada=1`).

## Instagram panel on the public detail

"Painel do Instagram" shows Seguidores, Visualizações, Interações, Novos seguidores and Conteúdo compartilhado as tiles (2 columns on phones, 3 from `sm`, 5 from `lg`). Empty metrics are left out. The legacy free-text answer is shown only when the creator has no number.

## Browser measurements

| Viewport | Check                                        | Result                            |
| -------- | -------------------------------------------- | --------------------------------- |
| 390 px   | Catalog with 4 featured creators and 4 cards | No horizontal overflow            |
| 375 px   | Landing, 2 banners: pause button             | 44 × 44 px                        |
| 768 px   | Featured row, 4 creators                     | 2 per row, 3 stops and indicators |
| 1440 px  | Featured row, 4 creators                     | 4 per row, static                 |
| 375 px   | Jornada badge on the detail header (`md`)    | 24 px logo, readable              |
