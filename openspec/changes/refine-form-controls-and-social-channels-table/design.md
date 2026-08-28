## Context

`src/shared/components/ui/input.tsx`, `select.tsx`, and `textarea.tsx` are the single source of every text field, dropdown, and textarea in the app (onboarding, login, profile edit, catalog filters, backoffice). They currently render at `h-11`/`h-12` with generous padding — sized for desktop, not for the phone-width screens most creators sign up from. `select.tsx` wraps `@base-ui/react/select`, a static-options dropdown with no text filtering. The project already depends on `@base-ui/react` (v1.6.0), which ships a full `combobox` primitive (`Root`, `Input`, `List`, `Item`, `Chips`/`Chip` for multi-select, `Empty`, `Clear`) — everything needed for a searchable dropdown is already in `node_modules`, no new dependency required.

The social channels table (shipped in the previous change) has its Principal star on the right, headers that don't line up with column content, bordered per-row cards, and a full-bleed width — this proposal corrects those against the design the user actually wants, and drops the free-text "Outra" network in the same pass since it's the same component.

## Goals / Non-Goals

**Goals:**
- One-time, base-component-level fix for control sizing so every screen shrinks together.
- A reusable searchable combobox (single- and multi-select) that becomes the system default, built on the primitive already in `node_modules`.
- Social channels table matches the requested layout exactly: brand-colored icons, Principal column first, left-aligned headers/content, borderless rows, centered table, centered follower numbers.
- Niche selection becomes a searchable multi-select instead of a 20+ item checkbox wall.
- Cidade/UF inputs align on the same baseline.
- A mobile-first pass across the main screens (onboarding, catalog, profile, backoffice) using a concrete, repeatable checklist.

**Non-Goals:**
- No visual redesign of colors/typography/branding — this is sizing, alignment, and interaction-pattern only.
- No change to which platforms are supported at the database level (`social_platform` enum keeps `OTHER` for historical data) — only the onboarding form stops offering it as a new choice.
- No migration of already-declared "Outra" channels for existing creators; they keep displaying normally in the catalog (their `platform` stays `OTHER`, `SocialPlatformIcon`'s existing generic fallback already renders something reasonable for that case).

## Decisions

**Base control sizing**: `Input`/`Select` trigger/`Textarea` shrink from `h-11`/`h-12` to `h-9` (2.25rem / 36px). 36px clears the WCAG 2.2 AA minimum target size (24px) with room to spare and matches common dense-SaaS-form sizing; text stays `text-sm` (already used on `md:` in `Input`) instead of `text-base` so the visual density change is consistent, not just shorter boxes with the same font scale. `Checkbox`/`RadioGroup` sizes are left alone — they're already small (per the screenshot, the checkboxes are appropriately sized; the complaint is specifically about text inputs and dropdowns).

**New `Combobox` base component** (`src/shared/components/ui/combobox.tsx`): wraps `@base-ui/react/combobox`, structured the same way `select.tsx` wraps `@base-ui/react/select` (matching part names: `Combobox`, `ComboboxTrigger`/`ComboboxInput`, `ComboboxContent`, `ComboboxItem`, `ComboboxEmpty`) so it's a familiar drop-in for anywhere `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` is used today. Takes the same `items: Record<string, string>` shape already used by `ControlledSelect` in `profile-form-fields.client.tsx`, so call sites mostly swap the import and component names rather than restructure their data. Text filtering uses Base UI's built-in substring `itemToStringLabel`-driven filter — no extra fuzzy-search dependency.

**Multi-select niche picker**: the same `Combobox` component with `multiple` (Base UI's own prop, confirmed on `ComboboxRootProps`), rendering selected niches as removable chips (`Combobox.Chips`/`Chip`/`ChipRemove`, primitives already in the package) above the search input. Replaces the current `<div role="group">` of 20+ individually-rendered checkboxes in `profile-form-fields.client.tsx`. The underlying form field stays `nicheSlugs: string[]` — no schema change, only the input widget changes.

**`Select` is not deleted**: `select.tsx` stays for the few remaining truly-fixed, very-short option lists if any turn up during implementation (e.g. binary-ish choices), but every dropdown migrated in this change (UF, segmento, tamanho da empresa, niches) moves to `Combobox`. Alternative considered: replacing `Select`'s internals in place to add search — rejected, because `Select` and `Combobox` are different Base UI primitives with different keyboard/ARIA models (listbox vs. combobox roles); swapping the primitive underneath the same wrapper would be a bigger, riskier diff than adding a new component and migrating call sites.

**Social channels table**:
- `SOCIAL_CHANNEL_PLATFORMS` drops `"OTHER"`; the "Outra"/custom-name input and `socialChannels[].label` field are removed from the domain parser, both Zod schemas, the repository write paths, and `form-error-summary.tsx`'s label map. The wider `social_platform` DB enum and the `CatalogSocialPlatform` type are untouched (they still need `OTHER` for historical rows and other features).
- Column order becomes Principal (star, first) → Rede Social (icon + checkbox) → Seguidores → Link do Perfil. The star column gets a fixed narrow track (e.g. `2.25rem`) in the grid template instead of sharing space with the other columns.
- `SocialPlatformIcon` gains a `color` mode: pass the icon's Simple Icons `.hex` as an inline `style={{ color: '#hex' }}` instead of inheriting `currentColor`, so each brand renders in its own color. LinkedIn's hand-drawn glyph gets a fixed brand-blue (`#0A66C2`, LinkedIn's own brand color) instead of `currentColor`.
- Header row and each column's cells share the same `text-left` alignment (the current header row and the Seguidores cell disagree — header is `uppercase`/left-ish via flex, cell content is `text-right`); Seguidores input becomes `text-center` per the request, and its header cell centers to match.
- Each channel row drops its `border` class; the outer wrapper keeps a single container border (already present) so the group still reads as one control, and the whole `<div>` gets `mx-auto max-w-3xl` (or similar) instead of stretching full-width.

**Cidade/UF alignment**: the current `grid grid-cols-[1fr_10rem]` row puts Cidade's `FieldDescription` ("Mínimo de 2 caracteres.") above its input with no equivalent under UF's label, so the two inputs start at different vertical offsets. Fix: add `items-end` to the grid row so both inputs bottom-align regardless of label/description height above them — a one-class change, no restructuring of either field.

**Mobile-first audit**: not a new component — a checklist applied screen-by-screen (sign-up, login, catalog list + detail, profile edit, backoffice account list + detail/edit): no unintended horizontal scroll, every tap target ≥36px, spacing collapses sensibly below `sm:`, and any already-existing `overflow-x-auto` region (e.g. tables) is intentional, not a symptom of something not wrapping.

## Risks / Trade-offs

- [Shrinking `Input`/`Select`/`Textarea` height is a single change with a huge blast radius — every screen in the app is affected at once] → It's also the entire point (point 7 of the request: fix once at the base-component level). Mitigate by running the full component/unit test suite (many tests assert on rendered classes/structure) and doing a visual pass on the highest-traffic screens (sign-up, login, catalog, profile) before calling it done.
- [Replacing `Select` with `Combobox` changes keyboard interaction (listbox vs. combobox ARIA pattern) for every migrated dropdown] → Base UI's combobox primitive is itself WAI-ARIA-compliant (combobox pattern), so this is a supported, accessible interaction change, not a regression — verified via the same axe-core accessibility test helper (`getBlockingComponentAccessibilityViolations`) already used in this codebase's component tests.
- [Dropping "Outra" is irreversible for the affected component tests and any in-flight drafts referencing `socialChannels[].label`] → Existing approved creators who previously used "Outra" are unaffected (their `social_profiles.platform = 'OTHER'` row and data stay exactly as stored); only new selections in the onboarding form lose the option. Draft payloads with a stale `label` field are simply ignored by the updated schema (extra key, non-`.strict()` where drafts are parsed) — no crash risk.

## Migration Plan

1. Ship the base component sizing change and the new `Combobox` component together (they're independent of each other but both touch `src/shared/components/ui/`, easiest to land as one deploy).
2. Migrate call sites (UF selects, segmento, tamanho da empresa, niches) from `Select`/checkbox-list to `Combobox` in the same change.
3. Social channels table restructure and "Outra" removal land together (same file, same review).
4. Mobile-first audit is the last pass, once the sizing/combobox changes are in, since it depends on the new component sizes to evaluate spacing correctly.
5. No data migration needed anywhere; this is presentation-layer only plus one schema narrowing (drop `label`/`OTHER` from the onboarding write path).

## Open Questions

None — Base UI already ships the primitive needed for the searchable dropdowns, so there's no build-vs-buy decision left to make.
