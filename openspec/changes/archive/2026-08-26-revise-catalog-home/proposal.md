## Why

The client's 2026-08-24 revision doc (R00) flags the authenticated home/catalog experience as creator-search-first when the top nav search should let creators find companies (by name or segment), the "Empresas aprovadas" language is redundant since every listed company is already approved, there's no filter bar or ad placement before the companies grid, the page has no static guidance content to keep it from feeling empty, and the authenticated app has no footer at all (terms/privacy/social links only exist on the public marketing page).

## What Changes

- Repoint the top nav search bar to search **companies** by name or segment, instead of creators by name/niche. **BREAKING**: requires a company-search query path parallel to (or replacing the primary use of) the existing creator-catalog search.
- Remove "Empresas aprovadas" / "Empresa aprovada" copy across the company carousel section (heading, subtitle, per-card badge, aria-label) since approval is no longer a distinguishing state to call out.
- Add a search/filter bar above the companies grid (filter by segment/niche, consistent with the categories a creator picked during onboarding).
- Surface ad/sponsorship banners between rows of the companies grid, reusing the existing sponsorship-slot infrastructure (`catalog-sponsorship-slots.tsx`).
- Add a static "tips" section for creators (e.g. "Atualize suas informações", "Aproveite as marcas", "Segurança sempre") — fixed content, no backing data.
- Add a footer to the authenticated app shell with links to Termos de Uso, Política de Privacidade, and Contente Creators' social media accounts (terms/privacy pages already exist).

## Capabilities

### New Capabilities
- `company-search`: search and filter companies by name or segment, replacing/supplementing the creator-only catalog search for company discovery.
- `catalog-tips-panel`: static guidance content shown to creators browsing the catalog.
- `app-footer`: footer for the authenticated app shell linking to legal pages and social accounts.

### Modified Capabilities
(none — no pre-existing specs for catalog/home)

## Impact

- `src/features/identity/components/authenticated-product-shell.client.tsx` (`CatalogHeaderSearch`, nav)
- `src/features/catalog/components/company-carousel.tsx` (copy removal, likely restructured into a full grid+filter view)
- `src/features/catalog/hooks/use-creator-catalog.ts`, `.../api/creator-catalog.api.ts`, `.../schemas/creator-catalog.schema.ts`, `.../server/repositories/drizzle-creator-catalog.repository.ts` (reference pattern for the new company-search path)
- `src/app/_components/catalog-sponsorship-slots.tsx` (reuse for inline banners in the companies grid)
- New: company-search hook/API/schema/repository (parallel to the creator-catalog stack)
- New: static tips component, footer component
