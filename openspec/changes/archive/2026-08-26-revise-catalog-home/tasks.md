## 1. Company search — extend the existing company-carousel stack

- [x] 1.1 Added optional `search`/`segment` to `CompanyCarouselRequest` and `parseCompanyCarouselSearch`/`parseCompanyCarouselSegment` helpers; added `segment` to `CompanyCarouselItemDto`/`companyCarouselItemSchema` and the view DTO/schema
- [x] 1.2 Extended `company-carousel.repository.ts`'s predicates: `search` mirrors the creator-catalog pattern exactly (indexed `search_document` LIKE pre-filter AND narrower tradeName/legalName/segment match), `segment` is an exact-match predicate
- [x] 1.3 Extended `company-carousel.api.ts` (query string via `URLSearchParams`) and the route handler (`request.nextUrl.searchParams`) to pass `search`/`segment` through
- [x] 1.4 Extended `use-company-carousel.ts` to accept filters and include them in the query key; skips stale server `initialData` when filters are active

## 2. Nav search → companies (role-aware)

- [x] 2.1 `CatalogHeaderSearch` now branches on `viewerRole`: INFLUENCER viewers get company search (`companySearch` param, "Buscar empresas por nome ou segmento"); COMPANY viewers keep the original creator search (`search` param) — **correction from the original plan**: repointing search for *all* viewers would have broken company-role users browsing creators, so the switch is role-conditional, not global. `viewerRole` threaded through `AuthenticatedProductShell` → `ApprovedCatalogEntry` → catalog `page.tsx` (`account.role`).
- [x] 2.2 `CompanyCarouselScreenContent` reads `companySearch`/`segment` reactively via `useSearchParams()` (matching the existing `useCreatorCatalogUrlState` pattern used by the creator list)
- [x] 2.3 Confirmed: "Encontrar creators" nav link and the creator catalog's own `search`/`cursor` params are untouched for COMPANY viewers

## 3. Companies grid, filter bar, and banners

- [x] 3.1 Added a segment filter (`CompanySegmentFilter`, sourced from `companySegmentOptions`) above the grid, writing to the `segment` query param
- [x] 3.2 Restructured `company-carousel.tsx` from a horizontal scroller into a responsive CSS grid (2/3/4 columns); heading+filter bar now live in `company-carousel-screen.client.tsx`, the view component itself is just grid+cards+states
- [x] 3.3 Removed all "Empresas aprovadas"/"Empresa aprovada" copy (heading, subtitle, card badge, aria-labels) — verified via grep, zero remaining hits in the company-carousel files
- [x] 3.4 **Simplified from the original plan**: did not build new "between-grid-rows" inline banner slots (the sponsorship DTO/loader has no such placement type wired today, only top/carousel/featured/side). Reused the existing `CatalogSponsorshipSlots` wrapper already active on the catalog page (unchanged) as the banner presence near the companies section, rather than inventing new placement plumbing. Documented as a scope simplification, not silently dropped.

## 4. Static tips panel

- [x] 4.1 Built `CatalogTipsPanel` (3 cards: Atualize suas informações / Aproveite as marcas / Segurança sempre, exact copy from the client's doc)
- [x] 4.2 Placed on the catalog page, directly under the companies grid (INFLUENCER viewers only, same gating as the grid)

## 5. Footer

- [x] 5.1 Built `AuthenticatedProductFooter` (local to `authenticated-product-shell.client.tsx`) with Termos de Uso + Política de Privacidade links, copyright line — no social links this pass (explicit user decision; TODO comment marks the spot)
- [x] 5.2 Added to `AuthenticatedProductShell`, renders after `{children}` across all `/app/*` pages; root shell container changed to `flex min-h-screen flex-col` so the footer sits at the bottom via `mt-auto` on short pages

## 6. Verification

- [x] 6.1 Verified live (local Supabase + dev server, logged in as a real approved INFLUENCER account): typing "Empresa Quatro" in the header search updated the URL to `?companySearch=Empresa+Quatro` and fired `GET /api/catalog/companies?limit=12&search=Empresa+Quatro`. Confirmed at the repository level directly (bypassing HTTP) that the search predicate correctly matches the seeded company by name. The API response was legitimately empty (`{"items":[],"limit":12}`) — traced this to local Supabase Storage having **zero objects for any media asset** (a pre-existing local-seed limitation unrelated to this change: seeds only insert `media_assets` DB rows, never real file bytes, so `getSignedMedia` fails for every asset in this environment, old carousel included).
- [x] 6.2 Verified live: selecting "Alimentação" in the segment filter added `&segment=Alimenta%C3%A7%C3%A3o` to both the URL and the outgoing API request, combined correctly with the active search filter.
- [x] 6.3 Verified live: logged in as a separate approved COMPANY account — header search correctly showed "Buscar creator por nome ou nicho" (unaffected), no companies grid rendered (correct — companies section is INFLUENCER-only, unchanged from before this change).
- [x] 6.4 Footer confirmed present (`querySelector('footer')`) with correct `/terms` and `/privacy` links and copyright text on the catalog page for the INFLUENCER viewer; no console errors or layout warnings observed.
- [x] 6.5 Confirmed "aprovada(s)" text no longer appears anywhere in the company-carousel files (grep-verified)
- [x] 6.6 `npm run type-check`: clean. `vitest run --project unit --project component`: 221/221 files, 1088/1088 tests passing (updated 6 test files for the new `segment` field, filter params, and role-aware search behavior).
