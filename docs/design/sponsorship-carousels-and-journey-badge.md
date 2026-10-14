# Sponsorship carousels, featured row and Jornada badge — UI patterns

Implemented from client review R04 (`openspec/changes/apply-client-review-r04`) and validated in Chromium on 2026-10-13 at 375, 768 and 1440 px. The product ships a light theme only: there is no `.dark` toggle and no `prefers-color-scheme` rule, so there is no dark variant to check.

## Shared carousel pattern (landing banners, featured creators, catalog carousel)

All three public carousels behave and look the same around their content:

- **Rhythm:** every carousel moves to the next slide every 5 s (`CAROUSEL_AUTO_ADVANCE_MS` in `src/shared/hooks/use-auto-advance.ts`) and wraps from the last slide to the first. A manual change (arrow, dot, scroll) restarts the full 5 s.
- **Control bar below the content, centered** (`SponsorshipCarouselControls`): `[‹]  ● ● ━━ ●  [›]`. Previous/next outline arrow buttons flank the indicator dots. There is no pause button: pausing is automatic (see pause rules). Nothing is overlaid on the slides. Arrows are 44 px touch targets below `lg` and 32 px from `lg` up (the responsive route audit fails touch targets under 44 px on phones and tablets).
- **Dots:** 10 px dots with a 24 px hit area; the active one is a 24 px pill with `aria-current="true"`. Banner dots are named "Ir para o banner N de M"; the card carousels use "Ir para a posição N de M dos criadores em destaque / dos patrocínios". Arrows wrap at both ends.
- **Keyboard:** ArrowLeft/ArrowRight move one slide while focus is anywhere inside the carousel (not inside inputs, not with modifier keys). Dots and buttons are ordinary focusable buttons.
- **Pause rules** (`useAutoAdvance`, all automatic, WCAG 2.2.2): a mouse pointer hovering the carousel (`pointerenter`/`pointerleave` with `pointerType` `mouse` only; the `pointerenter` that touch devices fire is ignored); press-and-hold on touch or pen (`pointerdown` with `touch`/`pen` pauses; `pointerup`, `pointercancel` or `pointerleave` resume the 5 s rotation, so a horizontal swipe, which the browser turns into a scroll and cancels the pointer, only pauses while the finger is down); keyboard focus inside it (mouse-click focus does not count); and a hidden tab. Nothing blocks the card rows' own scrolling.
- **Reduced motion:** with `prefers-reduced-motion: reduce` there is no autoplay, no crossfade, no smooth scroll; arrows and dots still work.
- **One slide:** renders as before, with no dots, no arrows, no autoplay and no `aria-roledescription` on the card rows.
- **Hydration:** nothing random or time-based in render. Timers, listeners and the `ResizeObserver` are cleaned up on unmount.

## Landing banner rotator (`landing-top`)

- `SponsorshipHeroRotator` (`src/features/sponsorships/components/sponsorship-hero-rotator.client.tsx`) renders up to five full-width banners in one grid cell, so the region keeps the banners' height. Only the active slide is exposed to assistive technology (`aria-hidden`, `inert`) and to the tab order.
- The banner itself (`SponsorshipHeroBanner`: image, copy, size) is untouched; only the control bar below it and the 5 s rhythm are carousel concerns. 300 ms crossfade (`motion-safe:` only). Images after the first are `loading="lazy"`.
- A single banner never reaches the rotator: callers render `SponsorshipHeroBanner` directly, so the page looks exactly as before.
- Region: `role="region"`, `aria-label="Banners patrocinados"`, `aria-roledescription="carrossel"`; each slide is a `group` with `aria-roledescription="slide"` and a label such as "Banner 2 de 5".
- Data: `GET /api/public/sponsorships/landing` returns a list. The client still accepts the old `null | object` shape during the CDN cache window.

## Card carousels: featured creators row (`catalog-featured`) and catalog carousel (`catalog-carousel`)

Both are a horizontal scroll-snap row driven by `useCardRowCarousel` (`use-card-row-carousel.ts`) and use the same card look (`rounded-2xl`, 1 px border, `shadow-sm`, `gap-4`, equal heights because the row is a flex container).

- 1, 2, 3 or 4 cards per row by breakpoint (`basis-full`, `sm`, `lg`, `xl`). Switching slides only scrolls the row, so nothing moves in the page layout; on phones the row bleeds to the screen edge (`-mx-4 px-4`) with `scroll-pl-4`, so the snapped card keeps the page margin.
- While every card fits, the row is static: no motion, no controls, no `aria-roledescription` on the featured row. Overflow is measured on the client with a `ResizeObserver` in a layout effect (before the first paint, so the control bar does not pop in later); the server render and the first client render are always the static layout. One card per row at 390 px means every card is a stop.
- Stop positions use the real distance between two cards, falling back to an average when it cannot be measured.
- The scroller `ul` is `relative`. Without it, absolutely positioned content inside the cards (sr-only text, stretched links) escapes the `overflow-x-auto` clip and widens the whole page; at 390 px the catalog scrolled sideways to about 1460 px. `e2e/acceptance/client-review-r04.spec.ts` keeps a regression check for this.
- Live region: the list is `aria-live="off"` while autoplay runs and `polite` when it is paused or reduced-motion.

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
| 375 px   | Landing, 2 banners: arrow buttons            | 44 × 44 px                        |
| 768 px   | Featured row, 4 creators                     | 2 per row, 3 stops and indicators |
| 1440 px  | Featured row, 4 creators                     | 4 per row, static                 |
| 375 px   | Jornada badge on the detail header (`md`)    | 24 px logo, readable              |
