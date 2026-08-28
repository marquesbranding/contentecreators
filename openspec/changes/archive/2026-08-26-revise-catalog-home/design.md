## Context

The authenticated catalog is built creator-first: `/app/catalog` and its whole query stack (`use-creator-catalog`, `creator-catalog.api`, `creator-catalog.schema`, `drizzle-creator-catalog.repository`) list and filter **creators**. Companies only appear in a secondary horizontal `company-carousel.tsx` with no search or filter controls at all. The top nav search bar currently searches creators, but the client wants it to search companies by name or segment — which doesn't fit the current architecture without a parallel data path. Separately, an ad/sponsorship banner system already exists (`catalog-sponsorship-slots.tsx`) and can be reused for the new companies grid. The authenticated app shell (`AuthenticatedProductShell`) has no footer; only the public marketing landing page does.

## Goals / Non-Goals

**Goals:**
- Nav search finds companies by name or segment.
- Companies grid has its own filter bar and ad banner placements.
- Static tips content and a footer exist in the authenticated app.
- "Empresas aprovadas" language removed.

**Non-Goals:**
- No removal of the existing creator-catalog search/filter functionality — creators may still need to be discoverable by companies elsewhere in the product; this change only redirects the *top nav* search to companies per the client's explicit ask.
- No change to the moderation/approval workflow that determines which companies are listed.
- No redesign of the creator card component.

## Decisions

- **Company search — extend, don't rebuild**: research during implementation found a company-carousel stack *already exists* (`company-carousel.schema.ts`, `.types.ts`, `use-company-carousel.ts`, `company-carousel.api.ts`, `company-carousel.repository.ts`, `company-carousel-view.service.ts`, route handler at `/api/catalog/companies`) — it just has no `search`/`segment` filters and no `segment` in its DTO. Extending this existing stack (add optional `search`/`segment` request params, add `segment` to the response item DTO, extend the repository's predicate building) is far lower-risk than building a parallel stack from scratch, and `company_profiles.search_document` already indexes trade name + legal name + segment + description — so "search by name or segment" is satisfied by the existing trigram search index with no new column needed. Cursor pagination (like creator-catalog) is *not* added — the existing flat `limit`-based list is kept, since company volume is small in this beta product; revisit if that stops being true.
- **Nav search param namespace**: the header search input now targets a **different query param** (`companySearch`) instead of the creator catalog's own `search` param, both read on the same `/app/catalog` page. This avoids the two searches (creator list below, company grid above) fighting over one shared param, and needs no new route — "Encontrar creators" still points at `/app/catalog`, and its own search/filter UI (reading `search`) is untouched.
- **Filter bar + banners**: build a new filter bar component for the companies grid, but reuse `catalog-sponsorship-slots.tsx`'s existing `SponsorshipTopBanner`/`INLINE_BANNER` placements rather than building new banner infrastructure.
- **Tips panel**: fully static content (no CMS/backend), matching the client's Mercado-Livre-inspired reference of fixed promotional/informational tiles.
- **Footer**: add to `AuthenticatedProductShell` so it's present across all `/app/*` pages; link to the existing `/terms` and `/privacy` routes, mirroring `MarketingFooter`'s structure (terms/privacy/support-contact-email). **No real brand social media URLs exist anywhere in the codebase** (confirmed by search) — per user decision, ship the footer *without* social links for now rather than fabricate them; leave a clearly-marked spot/comment for adding them later.

## Risks / Trade-offs

- [Extending the existing company-carousel stack instead of building a parallel one still touches its schema/types/repository/API/hook — a real, if smaller, surface] → Scoped tightly: additive optional fields only, no breaking change to the carousel's existing callers (the carousel keeps working with no filters passed).
- [Repointing the *primary* nav search to companies could reduce creator discoverability if companies were relying on that search to find creators] → Resolved: "Encontrar creators" nav item stays pointed at `/app/catalog` with its own unaffected `search` param — creator search capability is not removed, just no longer the *default* input in the header.
- [New footer adds a persistent layout element across every authenticated page] → Keep it low-height and non-intrusive; verify during implementation it doesn't clash with any sticky bottom UI (mobile action bars).

## Open Questions (resolved during implementation)

- Creator-catalog search/filter UI stays reachable via "Encontrar creators" (unchanged route, unchanged `search` param) — only the *header* input now targets companies via a new `companySearch` param. Confirmed as the implementation path (not re-verified with the client beyond the original doc's ask).
- Footer social media links: **omitted for this pass** per explicit user decision — footer ships with Termos de Uso, Política de Privacidade, and a support contact link only.
