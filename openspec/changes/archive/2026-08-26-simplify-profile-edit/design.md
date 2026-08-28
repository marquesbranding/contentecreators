## Context

`MediaUploadField` (`src/features/media/components/media-upload-field.client.tsx`) currently renders a full card per image slot — file picker, crop dialog, and "Enviar imagem" button — and is used twice in sequence (avatar, then cover) via `influencer-media-fields.client.tsx` and `company-media-fields.client.tsx`. The client wants each slot reduced to a single "Mudar foto" button that opens a small menu (Carregar foto / Remover foto atual / Cancelar), matching a pattern already partly visible elsewhere in the app.

## Goals / Non-Goals

**Goals:**
- Each image slot (profile, cover) is controlled by one "Mudar foto" button instead of a full stacked card.
- Existing crop, upload, and replace logic is reused, not rewritten.
- "Voltar ao catálogo" becomes "Voltar ao perfil" (and "catálogo" wording elsewhere on this screen becomes "Perfil").

**Non-Goals:**
- No change to image validation rules, file size limits, or storage/upload backend.
- No change to the `backHref` destination (`/app/catalog`) — only the label text changes, unless product decides otherwise (flagged as open question).

## Decisions

- Keep `useMediaUpload` and the underlying crop/upload/replace logic (`crop-image.ts`, `media-upload-policy.ts`) as the data layer; only restructure `MediaUploadField`'s presentation into a trigger button + menu/modal, since the existing logic already handles the crop → upload → replace lifecycle correctly.
- Menu options map directly to existing operations: "Carregar foto" opens the existing file picker/crop flow, "Remover foto atual" calls the existing remove/reset path, "Cancelar" closes the menu with no changes.

## Risks / Trade-offs

- [Collapsing two visible upload cards into a button-triggered menu could reduce discoverability for first-time users] → Use a clear "Mudar foto" label and show the current photo thumbnail next to the button so the affordance is obvious.
- [Label change from "Voltar ao catálogo" to "Voltar ao perfil" without changing `backHref` could read as misleading if it still navigates to `/app/catalog`] → Confirm with the client whether the destination should also change, or whether "voltar ao perfil" is meant loosely (see Open Questions).

## Open Questions

- Should "Voltar ao perfil" navigate somewhere other than `/app/catalog` (e.g. back to the creator's own public profile view), or is this purely a label change with the same destination? Assume label-only change unless the client clarifies.
