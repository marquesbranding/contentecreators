## Context

Pure copy change on a single shared component (`AuthPageShell`). No architectural, data-model, security, or migration concerns apply.

## Goals / Non-Goals

**Goals:**
- Tagline reads "Um acesso simples para conexões felizes." on login and any page sharing `AuthPageShell`.

**Non-Goals:**
- No change to the eyebrow text ("Creators e marcas, no mesmo ritmo") or any other copy/layout on the shell.

## Decisions

- Edit the string directly in `auth-page-shell.tsx`; no new prop or configurability needed since the copy is not expected to vary by page.

## Risks / Trade-offs

- [`AuthPageShell` is shared by forgot-password and reset-password pages, so this tagline change applies there too] → Acceptable; the tagline is generic enough to fit all three flows. Flag to the client if a page-specific tagline is actually wanted instead.
