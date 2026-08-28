## Context

`BrandLogo` (`src/shared/components/brand-logo.tsx`) renders an `<img>` absolutely positioned via percentage offsets tuned for its own `aspect-[2857/1039]` container, with a `resolvedBackground` that defaults to transparent for the `blue` variant. Two consumers break this: `onboarding-form-shell.tsx` and `auth-page-shell.tsx` each wrap it in a `bg-brand-night` element (painting a dark box behind the transparent PNG), and `auth-page-shell.tsx` additionally overrides `h-`/`w-` with an aspect ratio that doesn't match the component's internal layout math, cropping the artwork.

## Goals / Non-Goals

**Goals:**
- Logo renders cleanly (no dark box) on both the signup header and login mobile header.
- Logo renders uncropped at its correct aspect ratio in the login page's branded side panel.

**Non-Goals:**
- No changes to `BrandLogo`'s internal implementation, variants, or the logo assets themselves — the assets already have valid alpha channels.
- No redesign of the onboarding or login page layouts beyond the logo fix.

## Decisions

- Remove the `bg-brand-night` wrapper classes rather than switching `BrandLogo` to a `white`/dark variant, since the client's ask is a transparent/light-background logo, not a dark chip.
- For the login side panel, stop overriding raw `h-`/`w-` on `BrandLogo` and instead size its container to the component's native `aspect-[2857/1039]`, letting the component's internal percentage-based positioning work as designed.

## Risks / Trade-offs

- [Removing `bg-brand-night` could leave low contrast if the surrounding page background is ever dark] → Both current call sites (`bg-brand-canvas` signup page, light login header) are light, so this is not a concern today; revisit if a dark-mode surface adopts this wrapper.
