## Why

A client review document ("Contete Creator - revisão influenciador.pages", 24/08, R00) listed adjustments for the signup, catalog, and profile-edit flows. Most items were already implemented across earlier changes this session, and the text-only items were fixed directly while reconciling a large merge with `main`. Re-auditing the doc against the current codebase (post-merge) turned up three remaining concrete gaps that need real code changes, not just copy edits — plus one item confirmed already done and one confirmed blocked.

## What Changes

- Remove the duplicate "Empresas na comunidade" heading/paragraph that `company-carousel-screen.client.tsx` renders on top of `CompanyCarouselView`'s own "Marcas para conhecer" heading (a merge artifact — two stacked `<h2>`s).
- Add a company name/segment search text input next to the existing segment filter, wired to the `companySearch` query param the API already accepts.
- Move the creator-type badge (Creator UGC / Influenciador) on the creator detail page to render below the display name instead of above it, matching the reviewed mockup ("Thomas Marques UGC").
- Document (not implement) that footer social-media links remain blocked: no real Contente Creators social URLs exist anywhere in the codebase or fixtures, and none will be fabricated.
- No change needed: catalog cards already surface each creator's self-declared views and interactions (confirmed in `creator-catalog-view.client.tsx`'s `toCardViewModel`) — this doc item was already satisfied before this change.

## Capabilities

### New Capabilities
- `creator-detail-identity-layout`: creator-type badge position on the public creator detail page.

### Modified Capabilities
- `company-search`: adds a name-search input alongside the existing segment filter, and removes the duplicate heading currently rendered above the company carousel.

## Impact

- `src/features/catalog/components/company-carousel-screen.client.tsx` (remove duplicate heading, add search input)
- `src/features/catalog/components/catalog-detail-view.tsx` (badge reposition)
- `src/features/identity/components/authenticated-product-shell.client.tsx` — no code change, just a documented blocker for social links
- Out of scope: the onboarding social-channels table format (`src/features/onboarding/components/profile-form-fields.client.tsx`) is explicitly approved and must not change.
