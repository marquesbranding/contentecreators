## 1. Upload UI rework

- [x] 1.1 Added a "Mudar foto" trigger + action menu (Carregar foto / Remover foto atual / Cancelar) to `MediaUploadField`, replacing the file-picker-row + always-visible "Enviar imagem" card
- [x] 1.2 "Carregar foto" triggers the existing hidden file input; selecting a file reuses the existing crop/preview/upload flow unchanged
- [x] 1.3 "Remover foto atual" wired to a **new** `removeCurrent()` operation — this required backend work beyond the original scope (see below), since no removal capability existed anywhere in the media system before this change
- [x] 1.4 Shows a placeholder thumbnail (checkmark icon when a photo is set, generic icon when not) next to "Mudar foto" — a real signed-URL thumbnail of the *current* photo was out of scope (would require threading signed media URLs through several new layers); flagged as a deliberate simplification, not silently dropped
- [x] 1.5 Verified live: `influencer-media-fields.client.tsx` and `company-media-fields.client.tsx` both render correctly with the updated `MediaUploadField` (avatar/cover for influencer, logo/cover for company)

### 1.6 New backend capability (discovered mid-implementation, not in original scope)
`MediaUploadActions` had `prepare`/`finalize`/`activate` but **no removal operation at all** — there was no way to clear an active avatar/cover/logo without immediately replacing it. Built the missing capability, mirroring the existing `activateProfileMedia` pattern exactly:
- [x] Added `RemoveProfileMediaInput`/`Result`/`Action` types and `remove?` to `MediaUploadActions`
- [x] Added `removeProfileMediaSchema`
- [x] Added `removeProfileMedia` to `ProfileMediaReplacementRepository` (archives the current asset, sets the profile column to `null`, bumps version) and the Drizzle implementation
- [x] Added `removeProfileMedia` to `profile-media-replacement.service.ts` (with 3 new unit tests: success, access-denied, not-found mapping)
- [x] Added `removeProfileMediaAction` server action, exported from `src/features/media/server.ts`
- [x] Wired `remove: removeProfileMediaAction` into **both** `mediaActions` objects in `src/app/(product)/app/profile/page.tsx` (influencer and company) — caught and fixed a bug where an initial `replace_all` edit only matched one of the two due to differing indentation
- [x] `useMediaUpload` hook: added `removeCurrent`, `isRemoving`, `canRemove` (gated on `actions.remove` present, a current asset existing, and purpose not being `SPONSORSHIP_CREATIVE`)
- [x] `influencer-media-fields.client.tsx`/`company-media-fields.client.tsx`: added `onRemove` callbacks resetting local asset-id state to `null`
- [x] Added 3 component tests for the menu/remove flow (open menu, remove confirms + calls action + clears state; cancel leaves state untouched; "Remover foto atual" hidden when there's no current photo)
- [x] **Fixed a real bug found during manual testing**: after a successful upload, the component stayed stuck showing the crop/preview panel instead of collapsing back to the "Mudar foto" trigger, because `editing` was computed from `previewUrl`/`file` alone without checking `upload.phase`. Fixed by excluding the `"success"` phase from the `editing` condition.

## 2. Label changes

- [x] 2.1 Renamed "Voltar ao catálogo" → "Voltar ao perfil" in `influencer-profile-edit-form.client.tsx` (label only; `backHref` stays `/app/catalog` per design.md's assumption)
- [x] 2.2 Same rename in `company-profile-edit-form.client.tsx`
- [x] 2.3 Confirmed no other "catálogo" wording remains on this screen (grep-verified across the profile page, both edit forms, and the media components)

## 3. Verification

- [x] 3.1 Manual test (live, local Supabase + dev server, logged in as `creator-approved@contentecreators.test`): uploaded a real avatar image through the new "Mudar foto" → "Carregar foto" flow, confirmed "Imagem atualizada com sucesso.", confirmed in Postgres that `creator_profiles.avatar_asset_id` was set and the media asset was `ACTIVE`. Then removed it via "Mudar foto" → "Remover foto atual", confirmed the profile version bumped, `avatar_asset_id` became `null`, and the asset flipped to `ARCHIVED`.
- [x] 3.2 Manual test (same session, logged in as `company-approved@contentecreators.test`, which had a pre-seeded active logo): opened "Mudar foto" for the logo, confirmed "Remover foto atual" was offered, removed it, confirmed in Postgres `company_profiles.logo_asset_id` became `null` and the version bumped.
- [x] 3.3 Confirmed live: the back link reads "Voltar ao perfil" with `href="/app/catalog"` on both the influencer and company profile edit pages.
