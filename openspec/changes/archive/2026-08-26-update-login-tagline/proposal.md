## Why

The client's 2026-08-24 revision doc (R00) asks for the login page's tagline copy to change to a more emotionally resonant line.

## What Changes

- Update the login page's branded panel heading from "Um acesso simples para conexões bem cuidadas." to "Um acesso simples para conexões felizes."

## Capabilities

### New Capabilities
- `login-page-tagline`: formalizes the expected tagline copy shown on the login page's branded panel, since this text was not previously codified anywhere.

### Modified Capabilities
(none)

## Impact

- `src/features/identity/components/auth-page-shell.tsx` (shared across login, forgot-password, and reset-password pages — confirm the copy change is acceptable across all three before shipping, since they currently share this component and copy)
