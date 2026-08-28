## Context

A creator's social presence is stored as one `social_profiles` row per declared network (platform + link), and one linked `creator_metric_snapshots` row per `social_profiles` row (via `social_profile_id`). `creator_metric_snapshots` already has `follower_count`, `engagement_rate`, `view_count`, `interaction_count`, `new_follower_count`, `shared_content_description` columns, one row per channel — the schema is already "per channel." The bug is purely in the write path: `insertRoleProfile` (and the profile-edit equivalent `updateSocialAndMetric`) take a single flat `followers`/`views`/`interactions`/`newFollowers`/`sharedContent` value off the top-level form input and stamp the *same* numbers onto every channel's snapshot row. There is currently no concept of a "primary" channel; the catalog card/detail pipeline just takes `metrics[0]` (whatever `distinct on (platform) ... order by platform` happens to return first, i.e. alphabetical).

## Goals / Non-Goals

**Goals:**
- Each declared channel carries its own follower count.
- Visualizações/Interações/Novos seguidores/Conteúdo que você compartilhou are collected and stored only against the Instagram channel.
- A creator can flag exactly one declared channel as "Principal"; that channel drives what the catalog card/detail show.
- Mobile-first table UI: Rede Social (icon) | Seguidores | Link do Perfil | ★ Principal.

**Non-Goals:**
- No historical time-series UI for metrics (the `observed_on`/snapshot mechanism already exists and is untouched; we're fixing what gets written into a snapshot, not adding metric history browsing).
- No change to which platforms are supported (still `SOCIAL_CHANNEL_PLATFORMS`).
- Company social profile (single platform+link, no metrics) is unaffected — company path in `insertRoleProfile` doesn't touch `creator_metric_snapshots`.

## Decisions

**Follower count stays on `creator_metric_snapshots`, keyed per `social_profile_id` — no new column needed.** The table is already 1:1 with `social_profiles` at insert time. Fixing the bug is a data-flow change (map each channel's own `followerCount` instead of broadcasting one global number), not a schema change. Alternative considered: move `follower_count` onto `social_profiles` directly (simpler joins for the catalog query). Rejected — it would fork "current declared count" from the metric-snapshot history mechanism that already exists for this exact purpose, creating two sources of truth.

**"Primary" is a new `is_primary boolean not null default false` column on `social_profiles`**, not on `creator_metric_snapshots`. Being primary is a property of the *channel* (which one to feature), independent of any particular metric observation. A partial unique index enforces at most one primary per account:
```sql
create unique index social_profiles_owner_primary_uidx
  on social_profiles (owner_account_id)
  where archived_at is null and is_primary;
```
This makes "only one primary" a DB-level invariant instead of app-only validation, matching the existing pattern for `company_locations.is_primary` (unindexed there, but same boolean-flag idiom already used elsewhere in this schema).

**Migration backfill**: existing rows get `is_primary = false` by default. A backfill statement sets `is_primary = true` on each account's lowest-`sort_order` non-archived `social_profiles` row, so no existing creator ends up with zero primary channels (which would break the catalog card for already-approved profiles).

**Instagram-only extra metrics validated at the schema layer, not the DB layer.** `creator_metric_snapshots.view_count` etc. remain nullable columns usable by any platform's row — the DB does not know about "Instagram-only." The Zod schema (`socialChannelEntry`) and the repository write path enforce that only the entry with `platform === "INSTAGRAM"` may carry `views`/`interactions`/`newFollowers`/`sharedContent`; other platforms' rows get `null` for those four columns. Alternative considered: a DB check constraint gating those columns on `platform = 'INSTAGRAM'` joined through `social_profile_id` — rejected as impractical in Postgres (check constraints can't reference other tables) and brittle if a second platform ever needs its own extras.

**Card/detail "primary channel" resolution**: the metrics DTO returned by both the catalog list and detail queries gains an `isPrimary: boolean` field per metric entry (joined from `social_profiles.is_primary`). Client code picks `metrics.find(m => m.isPrimary) ?? metrics[0]` — the fallback covers the narrow window between "migration ran" and "backfill assigns a primary," and any data hiccup, without erroring the page.

**Onboarding table UX**: primary toggle only enabled/visible for a channel once it's checked; checking a channel with no existing primary auto-marks it primary (so the creator never has to think about it unless they declare 2+ channels); toggling a new star automatically un-stars the previous one (single client-side `Record` update, mirrors existing `channelState` pattern). Unchecking the current primary channel promotes the next checked channel (if any) to primary, keeping the invariant "at least one primary if at least one channel is checked" true client-side before submit — the server still validates it.

## Risks / Trade-offs

- [Existing approved creators have no primary channel pre-migration] → Backfill sets one deterministically (lowest `sort_order`) as part of the migration; verified via a post-migration count query (`select count(*) from social_profiles sp where archived_at is null and not exists (select 1 from social_profiles p2 where p2.owner_account_id = sp.owner_account_id and p2.is_primary)` should return 0 grouped appropriately).
- [Concurrent edits could momentarily violate "exactly one primary"] → The partial unique index makes a double-primary state impossible at the DB layer (insert/update raises a constraint violation instead of silently corrupting data); the reconciliation transaction in `updateSocialAndMetric` clears the old primary and sets the new one in the same transaction.
- [Widening `creatorCatalogBrowserCardSchema` / `catalogCreatorDetailViewSchema` with `isPrimary` is a `.strict()` schema change] → Both browser-facing schemas are already `.strict()`; every producer (repository → mapper → contract) must be updated in the same change or Zod parsing throws in production, same pattern already handled correctly for `interactionCount`/`viewCount` earlier this session.

## Migration Plan

1. Add `is_primary` column + partial unique index to `social_profiles` (new migration file).
2. Backfill: mark the lowest-`sort_order` non-archived channel primary per account.
3. Ship data-flow fixes (per-channel follower count, Instagram-scoped extras, primary read/write) in the same deploy — the column is additive and default-`false`, so it's safe to land ahead of the UI if needed, but there's no reason to split the rollout.
4. No rollback data loss: dropping the column/index is safe if this change needs to be reverted (no other table references `is_primary`).

## Open Questions

None — scope and data model are fully determined by the existing schema plus one additive column.
