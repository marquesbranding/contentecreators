## Why

Today every channel a creator declares shares one global follower count and one global set of extra metrics (Visualizações, Interações, Novos seguidores, Conteúdo que você compartilhou), which the repository layer duplicates verbatim into a metric-snapshot row per channel. This is factually wrong: a creator with 45k followers on Instagram and 2k on X gets "45k" recorded for both. It also makes the catalog card show whichever channel happens to sort first, not the channel the creator actually wants featured. Companies need real per-network reach numbers, and creators need to say which network best represents them.

## What Changes

- **BREAKING**: `followerCount` moves from the shared metric-snapshot fields to a per-channel field on the social channel entry itself. Every checked network (including "Outra") now requires its own follower count.
- **BREAKING**: Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou stop being global/duplicated fields. They become fields that apply only to the Instagram channel entry and are only collected/shown when Instagram is checked.
- Add a "Principal" designation per social channel: a star toggle, exclusive (only one channel can be primary at a time). Defaults to the first checked channel if the creator never picks one explicitly.
- The onboarding "Audiência e canais" table gains a follower-count column and a primary-star column, becoming: Rede Social (ícone) | Seguidores | Link do Perfil | Principal. Layout is mobile-first with aligned numeric columns.
- Brand icon on every platform row except "Outra", which uses a generic icon (existing `SocialChannelIcon` component/fallback).
- Catalog card and detail page stop picking an arbitrary metric row (`metrics?.[0]`) and instead render the creator's primary channel.
- Profile edit form gains the same per-channel follower count + primary toggle + Instagram-only extra metrics UI.

## Capabilities

### New Capabilities
- `social-channel-primary-designation`: a creator can mark exactly one declared social channel as "Principal"; that channel is the one surfaced in catalog card/detail views.

### Modified Capabilities
- `onboarding-social-channels`: each declared channel now also requires a follower count (previously only platform + link).
- `onboarding-creator-metrics`: Visualizações/Interações/Novos seguidores/Conteúdo que você compartilhou stop being global fields and become Instagram-channel-scoped fields, shown only when Instagram is checked.

## Impact

- **DB/schema**: `social_profiles` gains `follower_count` and `is_primary` columns (with a partial-unique or app-level constraint enforcing at most one primary per creator); `creator_metric_snapshots`' `view_count`/`interaction_count`/`new_follower_count`/`shared_content_description` become meaningful only for the Instagram-linked snapshot instead of being duplicated across all snapshots.
- **Onboarding**: `src/features/onboarding/domain/social-channels-form-data.ts`, `onboarding-form-schema.ts`, `onboarding-draft-schema.ts`, `profile-form-fields.client.tsx`, `use-onboarding-autosave.ts`, onboarding server actions/repositories (registration + admin + influencer edit + resubmission).
- **Catalog**: `drizzle-creator-catalog.repository.ts`, `creator-catalog.types.ts`, `creator-catalog.contract.ts`, `creator-catalog-view.client.tsx`, `drizzle-catalog-detail.repository.ts`, `catalog-detail.repository.ts`, `catalog-detail.mapper.ts`, `catalog-detail.types.ts`, `catalog-detail-view.schema.ts`, `catalog-detail-view.tsx` — all switch from "first/any metric row" to "the primary channel's row".
