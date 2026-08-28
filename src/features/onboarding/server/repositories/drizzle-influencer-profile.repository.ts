import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";

import { SOCIAL_CHANNEL_PLATFORMS } from "../../domain/social-channels-form-data";
import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import type { InfluencerProfileDto } from "../../types/influencer-profile.types";
import type { InfluencerProfileRepository } from "../services/influencer-profile.service";
import { persistCurrentAccountProfileCompletion } from "./drizzle-profile-completion.repository";
import {
  mapCreatorNicheSelection,
  resolveCreatorNiches,
} from "./creator-niche.repository";

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/gu, "");
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

/**
 * Channels declared before the fixed-platform picker (e.g. a custom "Outra"
 * network) aren't representable in the current form and are intentionally
 * left out of the edit view — `updateSocialAndMetric` never archives them,
 * so they stay exactly as stored and keep appearing in the catalog.
 */
function isManageableSocialChannel<
  T extends { platform: string },
>(socialProfile: T): socialProfile is T & {
  platform: (typeof SOCIAL_CHANNEL_PLATFORMS)[number];
} {
  return (SOCIAL_CHANNEL_PLATFORMS as readonly string[]).includes(
    socialProfile.platform,
  );
}

async function loadProfile(
  transaction: ApplicationTransaction,
  accountId: string,
): Promise<InfluencerProfileDto | null> {
  const [profile] = await transaction
    .select()
    .from(creatorProfiles)
    .where(
      and(
        eq(creatorProfiles.accountId, accountId),
        isNull(creatorProfiles.archivedAt),
      ),
    )
    .limit(1);

  if (!profile) {
    return null;
  }

  const ownedSocialProfiles = await transaction
    .select()
    .from(socialProfiles)
    .where(
      and(
        eq(socialProfiles.ownerAccountId, accountId),
        isNull(socialProfiles.archivedAt),
      ),
    )
    .orderBy(socialProfiles.sortOrder, socialProfiles.id);

  if (ownedSocialProfiles.length === 0) {
    return null;
  }

  const metricRows = await transaction
    .select()
    .from(creatorMetricSnapshots)
    .where(
      and(
        eq(creatorMetricSnapshots.creatorProfileId, profile.id),
        inArray(
          creatorMetricSnapshots.socialProfileId,
          ownedSocialProfiles.map((socialProfile) => socialProfile.id),
        ),
      ),
    )
    .orderBy(
      desc(creatorMetricSnapshots.observedOn),
      desc(creatorMetricSnapshots.createdAt),
      desc(creatorMetricSnapshots.id),
    );

  if (metricRows.length === 0) {
    return null;
  }

  const latestMetricBySocialProfileId = new Map<
    string,
    (typeof metricRows)[number]
  >();
  for (const row of metricRows) {
    if (
      row.socialProfileId &&
      !latestMetricBySocialProfileId.has(row.socialProfileId)
    ) {
      latestMetricBySocialProfileId.set(row.socialProfileId, row);
    }
  }

  const selectedNiches = await transaction
    .select({ id: niches.id, name: niches.name, slug: niches.slug })
    .from(creatorNiches)
    .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
    .where(eq(creatorNiches.creatorProfileId, profile.id))
    .orderBy(niches.sortOrder, niches.slug);
  const nicheSelection = mapCreatorNicheSelection(selectedNiches);

  return {
    avatarAssetId: profile.avatarAssetId,
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    coverAssetId: profile.coverAssetId,
    creatorType: profile.creatorType,
    displayName: profile.displayName,
    legalName: profile.legalName,
    nicheSlugs: nicheSelection.nicheSlugs,
    otherNiche: nicheSelection.otherNiche,
    socialChannels: ownedSocialProfiles.filter(isManageableSocialChannel).map((socialProfile) => {
      const metric = latestMetricBySocialProfileId.get(socialProfile.id);
      const isInstagram = socialProfile.platform === "INSTAGRAM";

      return {
        followerCount: metric?.followerCount ?? 0,
        interactions: isInstagram
          ? (metric?.interactionCount ?? undefined)
          : undefined,
        isPrimary: socialProfile.isPrimary,
        newFollowers: isInstagram
          ? (metric?.newFollowerCount ?? undefined)
          : undefined,
        platform: socialProfile.platform,
        sharedContent: isInstagram
          ? (metric?.sharedContentDescription ?? undefined)
          : undefined,
        url: socialProfile.normalizedUrl,
        views: isInstagram ? (metric?.viewCount ?? undefined) : undefined,
      };
    }),
    state: profile.state ?? "",
    version: profile.version,
    whatsapp: profile.whatsappE164 ?? "",
  };
}

async function updateNiches(
  transaction: ApplicationTransaction,
  profileId: string,
  requestedSlugs: string[],
  otherNiche?: string,
) {
  const availableNiches = await resolveCreatorNiches(
    transaction,
    requestedSlugs,
    otherNiche,
  );

  const currentLinks = await transaction
    .select({ nicheId: creatorNiches.nicheId })
    .from(creatorNiches)
    .where(eq(creatorNiches.creatorProfileId, profileId));
  const currentIds = new Set(currentLinks.map((link) => link.nicheId));
  const requestedIds = new Set(availableNiches.map((niche) => niche.id));
  const removedIds = [...currentIds].filter((id) => !requestedIds.has(id));
  const addedIds = [...requestedIds].filter((id) => !currentIds.has(id));

  if (removedIds.length > 0) {
    await transaction
      .delete(creatorNiches)
      .where(
        and(
          eq(creatorNiches.creatorProfileId, profileId),
          inArray(creatorNiches.nicheId, removedIds),
        ),
      );
  }

  if (addedIds.length > 0) {
    await transaction.insert(creatorNiches).values(
      addedIds.map((nicheId) => ({
        creatorProfileId: profileId,
        nicheId,
      })),
    );
  }
}

async function updateSocialAndMetric(
  transaction: ApplicationTransaction,
  accountId: string,
  profileId: string,
  input: InfluencerProfileEditInput,
) {
  const currentSocialProfiles = await transaction
    .select()
    .from(socialProfiles)
    .where(
      and(
        eq(socialProfiles.ownerAccountId, accountId),
        isNull(socialProfiles.archivedAt),
      ),
    )
    .orderBy(socialProfiles.sortOrder, socialProfiles.id)
    .for("update");
  const manageableCurrentSocialProfiles = currentSocialProfiles.filter(
    isManageableSocialChannel,
  );
  const currentByPlatform = new Map(
    manageableCurrentSocialProfiles.map((socialProfile) => [
      socialProfile.platform,
      socialProfile,
    ]),
  );
  const requestedPlatforms = new Set(
    input.socialChannels.map((channel) => channel.platform),
  );

  /*
   * Only reconcile channels on the fixed picker (`SOCIAL_CHANNEL_PLATFORMS`).
   * A channel on a platform the picker doesn't offer (e.g. a legacy "Outra"
   * network) isn't representable in `input.socialChannels` at all, so it
   * must never be archived just because it's absent from the request.
   */
  const removedIds = manageableCurrentSocialProfiles
    .filter((socialProfile) => !requestedPlatforms.has(socialProfile.platform))
    .map((socialProfile) => socialProfile.id);

  if (removedIds.length > 0) {
    await transaction
      .update(socialProfiles)
      .set({ archivedAt: new Date() })
      .where(inArray(socialProfiles.id, removedIds));
  }

  /*
   * Clear every current primary flag on manageable channels before assigning
   * the requested one so the partial unique index (at most one primary per
   * account) never sees two `true` rows at the same time between statements.
   * Legacy channels outside the picker keep whatever primary status they
   * already had.
   */
  if (manageableCurrentSocialProfiles.length > 0) {
    await transaction
      .update(socialProfiles)
      .set({ isPrimary: false })
      .where(
        inArray(
          socialProfiles.id,
          manageableCurrentSocialProfiles.map(
            (socialProfile) => socialProfile.id,
          ),
        ),
      );
  }

  const activeSocialProfiles: {
    id: string;
    platform: (typeof input.socialChannels)[number]["platform"];
  }[] = [];

  for (const channel of input.socialChannels) {
    const existing = currentByPlatform.get(channel.platform);

    if (existing) {
      await transaction
        .update(socialProfiles)
        .set({
          isPrimary: channel.isPrimary,
          normalizedUrl: channel.url,
        })
        .where(eq(socialProfiles.id, existing.id));
      activeSocialProfiles.push({ id: existing.id, platform: channel.platform });
      continue;
    }

    const [inserted] = await transaction
      .insert(socialProfiles)
      .values({
        isPrimary: channel.isPrimary,
        normalizedUrl: channel.url,
        ownerAccountId: accountId,
        platform: channel.platform,
      })
      .returning({ id: socialProfiles.id });

    if (!inserted) {
      throw new Error("Influencer social profile update failed.");
    }

    activeSocialProfiles.push({ id: inserted.id, platform: channel.platform });
  }

  const observedOn = new Date();
  const channelByPlatform = new Map(
    input.socialChannels.map((channel) => [channel.platform, channel]),
  );

  for (const socialProfile of activeSocialProfiles) {
    const channel = channelByPlatform.get(socialProfile.platform);
    const isInstagram = socialProfile.platform === "INSTAGRAM";
    const metricValues = {
      followerCount: channel?.followerCount ?? 0,
      interactionCount: isInstagram ? channel?.interactions : undefined,
      newFollowerCount: isInstagram ? channel?.newFollowers : undefined,
      sharedContentDescription: isInstagram ? channel?.sharedContent : undefined,
      viewCount: isInstagram ? channel?.views : undefined,
    };

    const [todayMetric] = await transaction
      .select({ id: creatorMetricSnapshots.id })
      .from(creatorMetricSnapshots)
      .where(
        and(
          eq(creatorMetricSnapshots.creatorProfileId, profileId),
          eq(creatorMetricSnapshots.socialProfileId, socialProfile.id),
          eq(creatorMetricSnapshots.platform, socialProfile.platform),
          eq(creatorMetricSnapshots.observedOn, observedOn),
        ),
      )
      .limit(1)
      .for("update");

    if (todayMetric) {
      await transaction
        .update(creatorMetricSnapshots)
        .set(metricValues)
        .where(eq(creatorMetricSnapshots.id, todayMetric.id));
      continue;
    }

    await transaction.insert(creatorMetricSnapshots).values({
      creatorProfileId: profileId,
      observedOn,
      platform: socialProfile.platform,
      socialProfileId: socialProfile.id,
      ...metricValues,
    });
  }
}

export function createDrizzleInfluencerProfileRepository(): InfluencerProfileRepository {
  return {
    loadApprovedProfile: loadProfile,

    async updateApprovedProfile(
      transaction,
      accountId,
      input,
      requestId,
      auditReason = "Update approved influencer profile",
      auditContext,
      persistCompletion = true,
    ) {
      const [currentProfile] = await transaction
        .select({
          id: creatorProfiles.id,
          version: creatorProfiles.version,
        })
        .from(creatorProfiles)
        .where(
          and(
            eq(creatorProfiles.accountId, accountId),
            isNull(creatorProfiles.archivedAt),
          ),
        )
        .limit(1)
        .for("update");

      if (!currentProfile) {
        throw new Error("Approved influencer profile was not found.");
      }

      if (currentProfile.version !== input.expectedVersion) {
        return {
          currentVersion: currentProfile.version,
          kind: "conflict",
        };
      }

      await applyVerifiedAuditContext(
        transaction,
        auditContext ?? {
          actorAccountId: accountId,
          actorRole: "INFLUENCER",
          actorType: "USER",
          reason: auditReason,
          requestId,
          source: "APPLICATION",
        },
      );

      const [updatedProfile] = await transaction
        .update(creatorProfiles)
        .set({
          bio: input.bio,
          city: input.city,
          creatorType: input.creatorType,
          displayName: input.displayName || input.legalName,
          legalName: input.legalName,
          state: input.state,
          whatsappE164: normalizeWhatsapp(input.whatsapp),
        })
        .where(
          and(
            eq(creatorProfiles.id, currentProfile.id),
            eq(creatorProfiles.version, input.expectedVersion),
          ),
        )
        .returning({ id: creatorProfiles.id });

      if (!updatedProfile) {
        return {
          currentVersion: currentProfile.version,
          kind: "conflict",
        };
      }

      await updateNiches(
        transaction,
        currentProfile.id,
        input.nicheSlugs,
        input.otherNiche,
      );
      await updateSocialAndMetric(
        transaction,
        accountId,
        currentProfile.id,
        input,
      );
      if (persistCompletion) {
        await persistCurrentAccountProfileCompletion(
          transaction,
          accountId,
          "INFLUENCER",
        );
      }

      const profile = await loadProfile(transaction, accountId);
      if (!profile) {
        throw new Error("Updated influencer profile could not be loaded.");
      }

      return {
        kind: "updated",
        profile,
      };
    },
  };
}
