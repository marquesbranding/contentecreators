## Why

The onboarding/profile forms carry two compounding problems: every form control (`Input`, `Select`, `Textarea`) is sized for desktop (h-11/h-12, generous padding), which reads as oversized and hurts density on the phone-width screens most creators actually sign up from; and the "Audiência e canais" table shipped last change has layout details that don't match the intended design — headers don't line up with their columns, the Principal star sits on the wrong side, follower counts aren't centered, and every plain `<select>`-style dropdown in the system (UF, segmento, tamanho da empresa, and now niches) is a static list instead of something a user can type to filter. Fixing these one screen at a time would mean re-patching the same problem in every form; the fix belongs in the shared design-system components so it lands everywhere at once.

## What Changes

- **BREAKING**: `Input`, `Select` trigger, and `Textarea` base components shrink (height/padding) — every screen using them changes size automatically.
- **BREAKING**: Onboarding social channels drop the "Outra" (custom network) option — only the fixed set of supported platforms can be declared. `socialChannels[].label` is removed from the schema.
- New shared `Combobox` component (searchable, single-select) built on Base UI's `combobox` primitive, replacing the plain `Select` as the default dropdown across the system (UF pickers, company segment, company size, and any other static-option dropdown).
- New shared multi-select combobox variant, used to replace the creator "Principais nichos" checkbox list (20+ checkboxes) with a single searchable multi-select field.
- Social channels table: brand-colored icons (not monochrome), Principal (star) column moves to the far left and becomes a narrow fixed-width column, column headers left-align with their column's content, per-row borders removed, the table is centered on the page, and the Seguidores input's number is center-aligned.
- Cidade/UF fields in the location section get consistent vertical alignment (both fields' labels/inputs start at the same baseline).
- A general mobile-first pass across onboarding, catalog, profile, and backoffice screens: no horizontal overflow, adequate touch targets, consistent spacing at narrow widths.

## Capabilities

### New Capabilities
- `compact-form-controls`: shared `Input`/`Select`/`Textarea` base components ship at a smaller, consistent size used everywhere.
- `searchable-select`: a shared searchable single-select combobox component, used as the system's default dropdown.
- `multi-select-search-picker`: a shared searchable multi-select combobox component, used for the creator niche picker.

### Modified Capabilities
- `onboarding-social-channels`: removes the "Outra" custom-network option; table layout requirements change (icon colors, column order, alignment, borders, centering).
- `onboarding-niche-selection`: niche selection moves from a checkbox list to a searchable multi-select dropdown.

## Impact

- **Design system**: `src/shared/components/ui/input.tsx`, `select.tsx`, `textarea.tsx` (sizing); new `src/shared/components/ui/combobox.tsx` (single- and multi-select variants) built on `@base-ui/react/combobox`.
- **Onboarding**: `src/features/onboarding/components/profile-form-fields.client.tsx` (social channels table restructure, niche picker swap, location field alignment, drop "Outra"), `src/features/onboarding/domain/social-channels-form-data.ts` (drop OTHER platform + label), `src/features/onboarding/schemas/onboarding-form-schema.ts` and `onboarding-draft-schema.ts` (drop `label`/OTHER), server actions/repositories that reference the OTHER platform or channel label.
- **Every screen using `Select`**: sign-up/login, company onboarding (segmento, tamanho da empresa), profile edit, backoffice/admin forms — all inherit the new searchable combobox by construction once the shared component changes.
- **Mobile-first audit**: touches layout classes across onboarding, catalog, profile, and backoffice screens without changing their data/behavior.
