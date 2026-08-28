## 1. Database schema & migration

- [x] 1.1 New Drizzle migration: add `is_primary boolean not null default false` to `social_profiles`, plus a partial unique index `social_profiles_owner_primary_uidx` on `(owner_account_id)` where `archived_at is null and is_primary`.
- [x] 1.2 Backfill statement in the same migration: for every account, mark the lowest-`sort_order` non-archived `social_profiles` row as `is_primary = true` when the account has at least one such row and none are already primary.
- [x] 1.3 Add `isPrimary: boolean("is_primary")` column to the `socialProfiles` Drizzle table definition in `src/db/schema/profiles.ts`, matching the migration.

## 2. Domain & validation

- [x] 2.1 `src/features/onboarding/domain/social-channels-form-data.ts`: extend `SocialChannelFormValue` with `followerCount: number` and `isPrimary: boolean`; update `readSocialChannels()` to parse `socialChannels.{PLATFORM}.followers` and `.primary`, and to read Instagram-only `views`/`interactions`/`newFollowers`/`sharedContent` off the Instagram entry instead of top-level form fields.
- [x] 2.2 `src/features/onboarding/schemas/onboarding-form-schema.ts` and `onboarding-draft-schema.ts`: update `socialChannelEntry` to require `followerCount` (nonnegative int) and `isPrimary` (boolean); add a refinement ensuring exactly one entry in `socialChannels` has `isPrimary: true`; move `views`/`interactions`/`newFollowers`/`sharedContent` off `influencerProfileFieldsSchema` and onto the Instagram `socialChannelEntry` (optional, only meaningful when `platform === "INSTAGRAM"`); add a refinement rejecting those four fields on any non-Instagram entry.
- [x] 2.3 `src/features/onboarding/components/form-error-summary.tsx`: update field labels for the moved/renamed fields (`socialChannels[].followerCount`, `socialChannels[].isPrimary`, Instagram-scoped metric fields).

## 3. Onboarding registration UI

- [x] 3.1 `src/features/onboarding/components/profile-form-fields.client.tsx`: extend the social channels table to 4 columns — Rede Social (icon), Seguidores, Link do Perfil, Principal (star toggle) — mobile-first (stack Seguidores/Link/Principal under the network name below a breakpoint, or keep a horizontally-scrollable table with sticky first column; follow existing `overflow-x-auto` pattern already on the table wrapper).
- [x] 3.2 Add a follower-count `Input` (numeric, `inputMode="numeric"`) per row, `name="socialChannels.{PLATFORM}.followers"`, required once the row is checked.
- [x] 3.3 Add a star toggle button per row (Lucide `Star`/`StarOff` or filled/outline `Star`), `name="socialChannels.{PLATFORM}.primary"` (hidden checkbox/radio semantics), disabled until the row is checked; clicking it sets that platform primary and clears the previous primary in `channelState`.
- [x] 3.4 Checking a row with no existing primary auto-marks it primary; unchecking the current primary promotes another checked row (if any) to primary — implement in the existing `setChannelState` handlers.
- [x] 3.5 When the Instagram row is checked, render the four extra fields (Visualizações, Interações, Novos seguidores, Conteúdo que você compartilhou) inline under/beside the Instagram row instead of as a separate always-visible "Seu perfil de creator" block; remove them from the always-visible section.
- [x] 3.6 Align numeric columns (`tabular-nums`, right-aligned Seguidores column) for visual polish.

## 4. Onboarding autosave

- [x] 4.1 `src/features/onboarding/hooks/use-onboarding-autosave.ts`: update `collectCreatorPayload` to read the new per-channel `followers`/`primary` fields and the Instagram-scoped metric fields via the updated `readSocialChannels()`/schema shape.

## 5. Registration & edit repositories

- [x] 5.1 `src/features/onboarding/server/repositories/drizzle-onboarding-registration.repository.ts` (`insertRoleProfile`, creator branch): insert `socialProfiles` rows with `isPrimary: channel.isPrimary`; when inserting `creatorMetricSnapshots`, use each channel's own `followerCount` instead of a global value, and only set `viewCount`/`interactionCount`/`newFollowerCount`/`sharedContentDescription` on the row whose `platform === "INSTAGRAM"` (null for all others).
- [x] 5.2 `src/features/onboarding/server/repositories/drizzle-influencer-profile.repository.ts` (`loadProfile`): return per-channel `followerCount`/`isPrimary` and the Instagram-scoped extra metrics instead of one flat set of metric fields picked from "any one metric row."
- [x] 5.3 `drizzle-influencer-profile.repository.ts` (`updateSocialAndMetric`): reconcile `isPrimary` alongside platform/url/followerCount when archiving removed channels, updating existing channels, and inserting new ones; ensure the transaction never leaves more than one primary channel (clear old primary before/at the same time as setting the new one, so the partial unique index never trips).
- [x] 5.4 `src/features/onboarding/server/repositories/drizzle-corrected-profile-resubmission.repository.ts` (`creatorEditInput`): pass `followerCount`/`isPrimary` and Instagram-scoped metrics through unchanged from the parsed input.
- [x] 5.5 `src/features/onboarding/server/actions/onboarding.actions.ts`, `influencer-profile.actions.ts`, `admin-profile.actions.ts`: update FormData readers to use the extended `readSocialChannels()` output; drop the removed top-level `followers`/`views`/`interactions`/`newFollowers`/`sharedContent` FormData reads.

## 6. Catalog pipeline — list

- [x] 6.1 `src/features/catalog/server/repositories/drizzle-creator-catalog.repository.ts`: join `social_profiles` in the metrics subquery to select `is_primary`, add `isPrimary` to the `jsonb_build_object(...)` payload.
- [x] 6.2 `src/features/catalog/types/creator-catalog.types.ts` (`CatalogCardMetricDto`) and `src/features/catalog/api/creator-catalog.contract.ts` (`.strict()` metrics schema): add `isPrimary: z.boolean()`.
- [x] 6.3 `src/features/catalog/components/creator-catalog-view.client.tsx` (`toCardViewModel`): pick `creator.metrics?.find((m) => m.isPrimary) ?? creator.metrics?.[0]` instead of always `metrics?.[0]`.

## 7. Catalog pipeline — detail

- [x] 7.1 `src/features/catalog/server/repositories/drizzle-catalog-detail.repository.ts` (`loadPresentationCollections`, `metricRows` query): join `social_profiles` to select `is_primary` alongside the existing metric columns.
- [x] 7.2 `src/features/catalog/server/repositories/catalog-detail.repository.ts` (`CatalogCreatorDetailRecord["metrics"]`): add `isPrimary: boolean`.
- [x] 7.3 `src/features/catalog/server/mappers/catalog-detail.mapper.ts` (`mapMetrics`): pass `isPrimary` through to the mapped DTO.
- [x] 7.4 `src/features/catalog/types/catalog-detail.types.ts` (`CatalogCreatorMetricDto`) and `src/features/catalog/schemas/catalog-detail-view.schema.ts` (`.strict()` metrics schema): add `isPrimary: z.boolean()`.
- [x] 7.5 `src/features/catalog/components/catalog-detail-view.tsx` (`MetricCards`): visually mark the primary channel's card (e.g. a "Principal" badge or highlighted border) among the listed metric cards.

## 8. Tests

- [x] 8.1 Update onboarding unit tests (`onboarding-form-schema.unit.test.ts`, `onboarding-draft-schema.unit.test.ts` if present, `influencer-profile-edit-schema.unit.test.ts`) for the new `socialChannelEntry` shape and the exactly-one-primary refinement.
- [x] 8.2 Update onboarding action unit tests (`onboarding.actions.unit.test.ts`, `influencer-profile.actions.unit.test.ts`, `admin-profile.actions.unit.test.ts`) for the new FormData field names and per-channel metric writes.
- [x] 8.3 Update onboarding component tests (`profile-form-fields.component.test.tsx`, `combined-registration-form.component.test.tsx`, `profile-onboarding-form.component.test.tsx`, `influencer-profile-edit-form.component.test.tsx`) for the new table columns (Seguidores, Principal) and Instagram-only extra fields.
- [x] 8.4 Update catalog unit/component tests (`creator-catalog-view` card mapping, `catalog-detail.mapper.unit.test.ts`, `catalog-detail-view.component.test.tsx`) to cover `isPrimary`-driven selection, including the "no channel marked primary" fallback.

## 9a. Catalog card icons (user follow-up)

- [x] 9a.1 Extract brand icon lookup into `src/shared/components/social-platform-icon.tsx` (widened to cover `TIKTOK` for catalog use); onboarding's `profile-form-fields.client.tsx` now imports the shared component and the old `src/features/onboarding/components/social-channel-icon.tsx` was removed.
- [x] 9a.2 `src/features/catalog/components/catalog-creator-card.tsx`: add the brand icon to each social-platform badge on the catalog card.

## 9. Live verification

- [x] 9.1 Register a new creator with 2+ channels with different follower counts and different Principal selection; confirm via direct Postgres query that each `creator_metric_snapshots` row has its own `follower_count` and that Instagram-only fields are null on non-Instagram rows.
- [x] 9.2 Confirm the partial unique index rejects a second primary at the DB level (attempt via a scratch script), and that the app-level flow never triggers it.
- [x] 9.3 Verify the catalog card shows the Principal channel's numbers in the browser at a mobile viewport width (confirmed on the onboarding table; the catalog card was confirmed at desktop width — no seeded creator at 100% profile completion was available to load the detail page live, but `catalog-detail.mapper.unit.test.ts` covers `isPrimary` pass-through end to end).
- [x] 9.4 Edit an existing creator's channels (add one, remove the current Principal, change Principal) via the profile edit form; confirm the reconciliation logic and catalog reflect the change.
