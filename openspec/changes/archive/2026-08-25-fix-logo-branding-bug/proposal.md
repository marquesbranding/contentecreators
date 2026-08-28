## Why

The `BrandLogo` component renders correctly on its own, but two call sites visually break it: a hardcoded dark wrapper (`bg-brand-night`) paints a black box behind the logo's transparent PNG on the signup page, and the login page overrides the logo's `h-`/`w-` classes with a different aspect ratio than the component's internal absolutely-positioned `<img>` expects, cropping the artwork. Client flagged both in the 2026-08-24 revision doc (R00) as visible bugs blocking the cadastro and login screens.

## What Changes

- Remove the `bg-brand-night` wrapper around `BrandLogo` in the onboarding form header so the logo sits on its intended transparent/light background.
- Remove the `bg-brand-night` wrapper around `BrandLogo` in the login page's mobile header for the same reason.
- Fix the login page's branded side panel so `BrandLogo` renders at its correct aspect ratio (stop overriding raw `h-`/`w-` with dimensions incompatible with the component's internal layout — either use a supported sizing prop/variant or wrap it in a container sized to the component's native `aspect-[2857/1039]`).

## Capabilities

### New Capabilities
- `brand-logo-rendering`: formalizes the correctness rules for the `BrandLogo` component — it SHALL render without an opaque background box and without cropping regardless of the surrounding container, since neither rule was previously codified and both were violated in production.

### Modified Capabilities
(none — no spec-level requirements are changing, only rendering correctness of an existing visual element)

## Impact

- `src/features/onboarding/components/onboarding-form-shell.tsx`
- `src/features/identity/components/auth-page-shell.tsx`
- No data model, API, or dependency changes.
