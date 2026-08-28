## Why

The client's 2026-08-24 revision doc (R00) flags the profile edit page's image upload UI as confusing — two full stacked cards (one for profile photo, one for cover photo), each with its own file picker and "Enviar imagem" button — and asks whether a simpler flow makes sense, referencing a single "Mudar foto" button that opens a small action menu (Carregar foto / Remover foto atual / Cancelar). Separately, the "Voltar ao catálogo" button label uses "catálogo" where the client wants "Perfil" language throughout this screen.

## What Changes

- Simplify the profile/cover image upload UI: replace the two stacked `MediaUploadField` cards with a single "Mudar foto" trigger per image slot that opens an action menu (Carregar foto / Remover foto atual / Cancelar), reusing the existing crop/upload/replace logic underneath.
- Rename the "Voltar ao catálogo" button to "Voltar ao perfil" on both the influencer and company profile edit forms, and replace "catálogo" wording elsewhere on this screen with "Perfil".

## Capabilities

### New Capabilities
- `profile-photo-upload-flow`: formalizes the single-button "Mudar foto" upload/replace/remove flow for profile and cover images, replacing the previous two-card layout which had no codified behavior.

### Modified Capabilities
(none — no pre-existing specs for profile editing; the change is UI simplification of existing, unspecified behavior)

## Impact

- `src/features/media/components/media-upload-field.client.tsx`
- `src/features/media/hooks/use-media-upload.ts`
- `src/features/media/components/influencer-media-fields.client.tsx`
- `src/features/media/components/company-media-fields.client.tsx`
- `src/features/onboarding/components/influencer-profile-edit-form.client.tsx`
- `src/features/onboarding/components/company-profile-edit-form.client.tsx`
- No data model changes — crop/upload/replace logic (`crop-image.ts`, `media-upload-policy.ts`) is reused as-is.
