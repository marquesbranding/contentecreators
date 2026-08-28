## Why

The client's 2026-08-24 revision doc (R00) flags the cadastro/onboarding form as needing a structural rework: the account-type choice is split awkwardly across two steps (role, then a separate "Tipo de atuação" dropdown), several profile fields are redundant or in the wrong place, the audience/channels section only captures one social network at a time despite creators having several, the niche list is too coarse to be useful (6 broad buckets, most creators fall into "Outros"), and a couple of sections are missing explanatory subtitles/copy.

## What Changes

- Merge the existing 2-way role picker (`INFLUENCER`/`COMPANY`) and the separate "Tipo de atuação" dropdown (`INFLUENCER`/`UGC`) into a single first-step 3-way choice: Influencer / UGC / Empresa. The chosen type continues to surface as a profile tag under the creator's name (already implemented on catalog cards).
- Move the WhatsApp+DDD field into the "Dados de acesso" (email/password) block, shared by both creator and company flows — it currently lives further down in the creator-only profile section.
- Remove the now-redundant "Tipo de atuação" field (superseded by the merged first step), "Taxa de engajamento (%)", and "Nome de creator" fields from the creator profile section.
- Add four new self-reported metric fields to the creator profile section: Visualizações, Interações, Novos seguidores, Conteúdo que você compartilhou.
- Rework "Audiência e canais" from a single platform-dropdown + link pair into a checklist of social networks (Instagram, Facebook, YouTube, X, Threads, Telegram, LinkedIn, Outra), each with its own checkbox and link field, allowing a creator to declare multiple channels. **BREAKING**: the onboarding form schema and server actions change from a single `socialPlatform`/`socialUrl` pair to an array of channel entries.
- Add `THREADS` and `TELEGRAM` to the social platform enum (currently missing).
- Replace the 6-option niche checklist (Beleza, Gastronomia, Moda, Tecnologia, Viagem, Outros) with the client-provided list of ~20 specific niches, plus a free-text "envie sua sugestão" option reusing the existing "other niche" pattern. Reconcile the onboarding form's local niche option list with the DB-backed `niches` table so both stay in sync.
- Add a subtitle to the "Localização" section: "Onde você tem base de moradia?"
- Update the first-step description copy per the client's revised wording.

## Capabilities

### New Capabilities
- `onboarding-account-type-selection`: the merged 3-way Influencer/UGC/Empresa choice as a single first-step decision that determines both `account_role` and `creator_type`.
- `onboarding-social-channels`: multi-network audience/channels declaration (checkbox + link per network) replacing the single platform+link pair.
- `onboarding-creator-metrics`: self-reported creator metric fields (Visualizações, Interações, Novos seguidores, Conteúdo compartilhado) collected during onboarding.
- `onboarding-niche-selection`: the expanded niche list with free-text suggestion, sourced consistently from the `niches` table.

### Modified Capabilities
(none — no pre-existing specs for onboarding; this proposal establishes the first specs for these capabilities)

## Impact

- `src/features/onboarding/components/combined-registration-form.client.tsx` (role/access step)
- `src/features/onboarding/components/profile-form-fields.client.tsx` (profile fields)
- `src/features/onboarding/schemas/onboarding-form-schema.ts`
- `src/features/onboarding/domain/profile-segments.ts` (niche options)
- `src/features/onboarding/server/actions/onboarding.actions.ts`
- `src/features/onboarding/server/services/influencer-profile.service.ts`
- `src/db/schema/enums.ts` (add `THREADS`, `TELEGRAM` to social platform enum — migration required)
- `src/db/schema/profiles.ts` (`creator_metric_snapshots`, `social_profiles` tables — migration required for new metric columns)
- `supabase/migrations/20260723190000_onboarding_reference_data.sql` (niches seed data)
- `src/app/(auth)/sign-up/page.tsx` (step description copy)
- Catalog creator card (`catalog-creator-card.tsx`) already renders the creator-type tag — no change expected there, but should be verified once the 3-way step lands.
