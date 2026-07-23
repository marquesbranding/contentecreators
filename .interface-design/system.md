# Contente Creators interface system

## Direction

**Users:** Brazilian creators, UGC creators, companies seeking creators, and backoffice operators.

**Primary outcome:** Make joining, completing a profile, understanding review status, discovering approved creators, and moderating registrations feel obvious on a phone.

**Personality:** Energetic, welcoming, direct, and trustworthy. The supplied logo is intentionally loud and playful; product screens temper that energy with calm structure and readable hierarchy.

**Foundation:** Warm off-white product canvas, deep-night marketing anchors, white working surfaces, and the logo's electric blue as the dominant action color. Pink, sky, royal blue, and lime form a supporting marketing spectrum.

**Depth:** Borders and restrained soft shadows for product surfaces. Marketing may use bold black outlines or offset shadows when they reinforce the logo's poster-like character.

## Tokens

### Color

```css
--brand-blue: #036afc;
--brand-blue-hover: #0059db;
--brand-blue-soft: #eaf2ff;
--brand-ink: #080808;
--brand-canvas: #f7f6f2;
--brand-pink: #f5167e;
--brand-lime: #c5f500;
--brand-sky: #1e9bf0;
--brand-royal: #1b1bb8;
--brand-night: #0a0a0f;
--brand-night-surface: #13131c;
--brand-surface: #ffffff;
--brand-muted: #686868;
--brand-border: #deddd8;
--brand-success: #138a5b;
--brand-warning: #b86800;
--brand-danger: #c72c41;
```

Blue is for the main action, active state, focus, and concise branded emphasis. Pink, sky, royal blue, and lime distinguish marketing moments and audiences; they do not become status colors or compete with product actions. Deep night carries the strongest typographic hierarchy and branded navigation surfaces.

### Spacing

Base unit: 4 px.

Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.

Product forms use 16–24 px internal spacing. Marketing sections use 48–80 px vertical rhythm. Mobile outer gutters begin at 20 px and grow to 32/48 px.

### Radius

- Controls: 12 px
- Product cards/dialogs: 16 px
- Marketing cards: 20–24 px
- Pills: 999 px

The round scale echoes the logo's smiling mark without turning every container into a pill.

### Typography

Font: Geist variable for interface and display text.

- Display: 40–72 px, 700–800, tight line height
- Page title: 30–40 px, 700
- Section title: 24–32 px, 650–700
- Body: 16–18 px, 400–500
- UI label: 14–16 px, 550–650
- Supporting text: 13–14 px, 400–500

Headlines are short, direct, and sentence case. Avoid all-caps body copy; reserve uppercase for compact labels and branded moments.

## Product patterns

### Component foundation

- shadcn/ui is the default component foundation for authenticated product screens and the backoffice.
- Prefer composing its primitives for forms, validation feedback, dialogs, sheets, menus, tables, tabs, filters, pagination, skeletons, alerts, toasts, and empty states.
- Extend components through shared variants and design tokens instead of rebuilding equivalent controls inside each feature slice.
- Keep domain behavior in slice hooks, services, and stores; shadcn/ui components remain presentation primitives.
- Add components as product flows require them rather than generating the entire catalog before use.
- Marketing pages may use more bespoke compositions while still reusing shared shadcn/ui controls where appropriate.

### Primary button

- Minimum height: 48 px
- Horizontal padding: 20–24 px
- Radius: 12 px or pill when used as a marketing CTA
- Background: brand blue
- Text: white, 600
- Focus: visible 3 px blue-soft/blue ring
- Disabled and pending states remain distinguishable without relying on opacity alone

### Secondary button

- Minimum height: 48 px
- White or transparent background
- 1 px ink/border outline
- Strong focus and hover feedback

### Product card

- White surface on warm canvas
- 1 px neutral border
- 16 px radius
- 20–24 px padding
- Optional subtle shadow only for elevated/interactive states

### Form control

- Minimum height: 48 px
- 12 px radius
- Persistent label, helper/error region, clear focus ring
- Loading and async result states announced to assistive technology

### Status surface

- One clear status title, explanation, next action, and support path
- Icon/color reinforce text but never replace it
- Pending review uses calm blue, correction requests use warning, suspension/ban use danger

## Marketing patterns

- Black header/brand panels allow the supplied blue-and-white logo to blend with its original black field.
- The external gray edge in the supplied PNG is clipped in presentation rather than redrawing the brand asset.
- The supplied logo is always used as the source asset; never reconstruct it with CSS or replace it with a wordmark.
- Hero composition uses one dominant statement, two audience CTAs, and an illustrative product preview without public creator/company listings.
- Static radial light washes may add depth to the hero. A darkened pink-to-royal gradient is reserved for prominent marketing CTA surfaces.
- Never place small white body text directly on the base pink or sky tokens; use night text or darken the surface to preserve WCAG contrast.
- Interface symbols use Lucide icons. Do not use emoji as interface iconography or decoration.
- No fake participant photos, company logos, testimonials, or inflated counters.

## Decisions

| Decision                                        | Rationale                                                                                                    | Date       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Electric blue + ink + warm canvas               | Preserves the supplied logo's energy while keeping long product journeys comfortable and trustworthy         | 2026-07-23 |
| One variable typeface                           | Reduces font/network cost and keeps product and marketing surfaces coherent                                  | 2026-07-23 |
| Soft product geometry, bolder marketing framing | Supports mobile form usability while reflecting the playful speech-bubble logo on acquisition surfaces       | 2026-07-23 |
| Minimal client boundaries                       | Protects Server Component performance and prevents the entire design system from entering the browser bundle | 2026-07-23 |
| Supporting marketing spectrum                   | Brings the approved mock's energy into acquisition pages without weakening blue's role in the SaaS product   | 2026-07-23 |
| shadcn/ui-first product surfaces                | Keeps complex forms and backoffice interactions accessible, consistent, and fast to evolve                   | 2026-07-23 |
