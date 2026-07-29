# Performance budgets and release audit

## Scope

The release audit covers the public landing page, authentication, onboarding,
protected catalog, profile editing, and backoffice. Measurements must use a
production build (`next build` + `next start`), not the development server.

No external telemetry service is required for the Beta. The repository provides
repeatable local lab checks; field data can be connected later without widening
the root Client Component boundary.

## Budgets

| Signal                          |           Budget |
| ------------------------------- | ---------------: |
| TTFB                            |         ≤ 800 ms |
| FCP                             |       ≤ 1,800 ms |
| LCP                             |       ≤ 2,500 ms |
| CLS                             |           ≤ 0.10 |
| INP (field/release browser run) |         ≤ 200 ms |
| Landing client JavaScript       | ≤ 150,000 B gzip |
| Any route client JavaScript     | ≤ 280,000 B gzip |
| Catalog client JavaScript       | ≤ 330,000 B gzip |
| Profile editor JavaScript       | ≤ 310,000 B gzip |
| Company/creator onboarding      | ≤ 410,000 B gzip |
| Sponsorship manager JavaScript  | ≤ 320,000 B gzip |
| Largest client chunk            | ≤ 110,000 B gzip |
| Largest CSS chunk               |  ≤ 40,000 B gzip |
| Self-hosted fonts               |      ≤ 300,000 B |
| Largest official logo source    |      ≤ 180,000 B |

The executable source of truth is
`src/shared/performance/performance-budgets.ts`. A budget increase requires a
documented product reason and a before/after measurement; it must not be used to
hide a regression.

The five route-specific ceilings cover the media-enabled forms and catalog
experience. They are exact route keys, not wildcards, so every new route
inherits the stricter 280 kB ceiling. The measured baseline retains 4–6%
headroom on the complex routes; another broad client dependency should fail the
guard.

## Implemented controls

- Geist variable fonts use `next/font`, are self-hosted, and introduce no
  browser request to Google.
- Official logos use `next/image` with explicit intrinsic size and responsive
  `sizes`; only the visible brand variant is requested.
- Private signed media deliberately bypasses the shared optimizer/cache because
  the URL is a short-lived bearer credential. Every production renderer
  reserves dimensions, uses an explicit aspect ratio, blocks the referrer, and
  lazy-loads below-the-fold media. The catalog cover is eager/high priority
  because it can be the detail page LCP.
- The public landing, Terms, and Privacy routes remain Server Component trees
  without the TanStack Query/Zustand application provider. TanStack Query is
  mounted for auth and backoffice where the full route group consumes it; in
  product routes it starts only inside the client entry points that execute
  queries. Server render functions never cross the provider boundary.
- Catalog list hydration uses the server-prefetched infinite-query cache.
  Company carousel hydration keeps server data fresh for 30 seconds, preventing
  an immediate duplicate Axios request while remaining below signed-media TTL.
  Independent catalog, sponsorship, and carousel server reads run in parallel.
- The global Zustand store currently has no consumer and is not mounted.
  Future consumers must select the smallest scalar/action slice rather than
  subscribing to the complete store.
- Existing route-level loading UI streams onboarding, account lists, and the
  protected backoffice shell. Skeleton dimensions reserve final layout space.
  Do not place landing LCP content behind a Suspense boundary.
- The hero title and description are present in the initial server HTML and do
  not animate. Magic UI motion remains below the fold, where it cannot postpone
  the critical text paint.

## Measured baseline

The 2026-07-29 production-build baseline passed the executable browser budgets:

| Profile      |    TTFB |   FCP |   LCP | CLS |
| ------------ | ------: | ----: | ----: | --: |
| Mobile 390   | 12.7 ms | 68 ms | 68 ms |   0 |
| Desktop 1440 |    9 ms | 44 ms | 44 ms |   0 |

The same build passed the static delivery guard with 82,333 B gzip of landing
client JavaScript, a 71,045 B gzip largest client chunk, an 18,095 B gzip
largest CSS chunk, 146,464 B of self-hosted fonts, and a 154,313 B largest
official logo source.

A separate warmed Lighthouse 12.8.2 run scored 94 for Performance and 100 for
Accessibility, Best Practices, and SEO. It reported FCP 1.208 s, CLS 0, and TBT
11.5 ms. Its Lantern-simulated LCP was 3.035 s even though the trace insight in
the same artifact measured 11.4 ms of TTFB plus 136.3 ms of element render
delay. The LCP node was already-static server-rendered hero copy and had no
network resource.

This contradiction is recorded rather than hidden by a cosmetic content or
layout change. The local release gate uses the real production-browser
measurements from `performance:measure`; the Lighthouse simulation remains a
diagnostic artifact. Production p75 LCP and INP must replace the local baseline
when field telemetry is connected.

## Reproducible release commands

```bash
npm run build
npm run performance:budget
npm run performance:measure
```

`performance:budget` reads Next.js client-reference manifests and compressed
production chunks. `performance:measure` starts the production server on an
isolated local port and records TTFB, FCP, LCP, and CLS in Chromium at 390 px and
1440 px.

For a full Lighthouse artifact without adding a runtime dependency or external
service:

```bash
npx --yes lighthouse@12.8.2 http://127.0.0.1:3000 \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=/tmp/contente-creators-lighthouse.json
```

Start the built application with `npm run start` first. Run Lighthouse in a
clean browser profile and keep the JSON artifact with the release evidence.
Lighthouse is simulated lab data; production INP and percentile validation still
require field telemetry after the client approves a provider.

## Regression triage order

1. Check accidental root-level `"use client"` boundaries or providers.
2. Inspect route client-reference manifests and the largest compressed chunk.
3. Remove hydration refetches and sequential independent requests.
4. Verify LCP media priority and that lazy media reserves its final dimensions.
5. Check motion under reduced-motion and long main-thread tasks before changing
   a budget.
