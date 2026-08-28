## Context

The onboarding form (`combined-registration-form.client.tsx` + `profile-form-fields.client.tsx`) currently models account type as two separate decisions (`role`: INFLUENCER/COMPANY, then a later `creatorType`: INFLUENCER/UGC dropdown), captures audience via one platform+link pair even though `social_profiles` is already a proper multi-row table, and hardcodes a 6-item niche list locally in `profile-segments.ts` that has drifted from the DB-backed `niches` table used elsewhere. The client's revision doc asks for a single 3-way type choice, multi-network audience capture, an expanded niche list, and four new self-reported metrics that have no existing columns.

## Goals / Non-Goals

**Goals:**
- Single first-step 3-way account type choice (Influencer / UGC / Empresa) driving both `account_role` and `creator_type`.
- Multi-network audience capture using the existing `social_profiles` table, extended to support Threads and Telegram.
- Niche options sourced from a single source of truth (the `niches` table) matching the client's ~20-item list, with a free-text suggestion fallback.
- Four new self-reported metrics stored per the existing `creator_metric_snapshots` pattern.
- Field relocation/removal (WhatsApp moved up, Tipo de atuação/Taxa de engajamento/Nome de creator removed) without breaking existing approved profiles.

**Non-Goals:**
- No change to the moderation/approval workflow itself.
- No redesign of the catalog card display beyond what already renders the creator-type tag.
- No retroactive backfill of the new metric fields for already-approved profiles (they remain null/unset until the creator edits their profile).

## Decisions

- **Account type merge**: keep `account_role` and `creator_type` as separate DB enums/columns (no schema change needed there) but derive both from one UI control. `Empresa` → `account_role=COMPANY`, `creator_type=null`; `Influencer`/`UGC` → `account_role=INFLUENCER`, `creator_type=INFLUENCER`/`UGC` respectively. Rationale: avoids a DB migration for something that's purely a UI/state-shape change; the two enums already model the right domain.
- **Social channels**: use the existing `social_profiles` table (owner + platform + url, unique per owner/platform/url) rather than introducing a new table. Extend `socialPlatformEnum` with `THREADS` and `TELEGRAM` via migration. The onboarding form collects an array of `{platform, url, selected}` entries instead of one pair; the server action writes one row per checked network with a non-empty URL.
- **New metrics**: add `views_count`, `interactions_count`, `new_followers_count`, `shared_content_description` (or similar) to `creator_metric_snapshots`, matching the existing self-reported-metric pattern (rather than a new table), since this table already models per-snapshot, per-platform self-reported numbers like `followers`/`engagement_rate`. Exact column set finalized during implementation after re-reading `creator_metric_snapshots`'s current shape.
- **Niche list**: treat `niches` (DB table, already seeded via migration) as the single source of truth. Update the seed migration to the client's ~20-item list, and change `profile-segments.ts`'s `creatorNicheOptions` to read from the same source the catalog/repository already uses (`creator-niche.repository.ts`) instead of a separately hardcoded array. The "envie sua sugestão" free-text option reuses the existing `OTHER_NICHE_SLUG`/`otherNiche` pattern already implemented in the form.
- **Removed fields**: `engagementRate` and `followers` are not columns on `creator_profiles` — they're read/written through `creator_metric_snapshots` via the profile service. Confirm the service's read/write paths before deleting the UI fields so no dangling required-field validation is left in `onboarding-form-schema.ts`.

## Risks / Trade-offs

- [Merging two decisions into one changes the shape of `combined-registration-form.client.tsx`'s local state and the schema's `superRefine` logic] → Cover with the same discriminated-union pattern already used for role-conditional fields; add form-level tests for all three type choices before removing the old two-step code path.
- [Extending `socialPlatformEnum` is a Postgres enum migration — adding values is safe/append-only, but any code with an exhaustive switch over the enum must be updated] → grep for `socialPlatformEnum` usages across the repo during implementation, not just the onboarding form.
- [New metric columns on `creator_metric_snapshots` change a table read by the profile service and possibly the catalog card] → Confirm nothing downstream assumes a fixed column set (e.g. `SELECT *` mapped to a strict type) before migrating.
- [Niche list reconciliation touches both a migration (DB seed) and the onboarding form's option source] → Sequence migration first, then update `profile-segments.ts` to read from the same source, to avoid a window where the UI and DB disagree.

## Migration Plan

1. DB migration: extend `socialPlatformEnum` with `THREADS`, `TELEGRAM`; add new metric columns to `creator_metric_snapshots`; update `niches` seed data to the new ~20-item list (additive — do not delete niches already referenced by approved profiles without a mapping).
2. Update `onboarding-form-schema.ts` for the new account-type shape, social-channels array, new metric fields, and removed fields.
3. Update `profile-form-fields.client.tsx` and `combined-registration-form.client.tsx` UI to match.
4. Update `onboarding.actions.ts` / `influencer-profile.service.ts` to read/write the new shapes.
5. Update `profile-segments.ts` to source niches from the DB table instead of a hardcoded array.
6. Manual QA across all three account types (Influencer, UGC, Empresa) end to end.

No rollback complexity beyond standard migration revert — no destructive column drops in this change (removed UI fields' underlying columns, if any, are left in place rather than dropped, to avoid data loss for existing profiles).

## Open Questions (resolved during implementation)

- **New metric columns**: added directly to `creator_metric_snapshots` as `viewCount`, `interactionCount`, `newFollowerCount` (bigint, nullable) and `sharedContentDescription` (text, nullable), alongside existing `followerCount`/`engagementRate`.
- **`displayName` ("Nome de creator") removal**: the DB column (`creator_profiles.display_name`) stays `NOT NULL` — no migration. The server derives it from `legalName` when the field is absent from form input, since the doc only asks to remove the *form field*, not the underlying "how a creator is displayed" concept.
- **WhatsApp relocation is presentation-only**: the field stays inside `ProfileFormFields` (used by both registration and profile-edit flows) behind a new `showWhatsappField` prop (default `true`, preserving edit-flow behavior). `CombinedRegistrationForm` renders its own WhatsApp field in "Dados de acesso" and passes `showWhatsappField={false}` to `ProfileFormFields`, since only the registration flow has an access-step to hoist it into. `profile-onboarding-form.client.tsx` (post-confirmation profile completion) has no access step either, so it keeps the default.
- **Niches stay a manually-mirrored list, not dynamically DB-sourced**: `creatorNicheOptions` in `profile-segments.ts` is already a hardcoded list whose slugs must exactly match `niches.slug` in the DB (the server rejects unknown slugs in `resolveCreatorNiches`). Making this fully dynamic (fetched at render time) is a bigger architectural change than the client asked for. Instead: update both the hardcoded list and the seed migration to the same ~20-item slug set, preserving the existing pattern.
- **Multi-network social channels — write-path only change**: the catalog read path (`drizzle-creator-catalog.repository.ts`) already aggregates `social_profiles` and `creator_metric_snapshots` per platform via `jsonb_agg`/`distinct on (platform)` — it was already built for multiple rows per creator. Only the *write* paths (registration, profile-edit, corrected-resubmission repositories) assume a single social profile row and need rework to upsert one `social_profiles` row per checked network, archiving rows for unchecked networks. Since the four new metric fields are collected once (not per network), the same self-reported metric values are written as a `creator_metric_snapshots` row for each selected platform, matching the catalog's per-platform display expectation without asking the creator to enter numbers per network.
- **`accountType` merge is a value-format coincidence worth using**: the three choices (Influencer/UGC/Empresa) map directly — `accountType === "COMPANY"` gives `role="COMPANY"`, otherwise `role="INFLUENCER"` and `creatorType=accountType` (`"INFLUENCER"` or `"UGC"` pass through unchanged), since `creatorType`'s enum values already are `INFLUENCER`/`UGC`. No new enum needed.
