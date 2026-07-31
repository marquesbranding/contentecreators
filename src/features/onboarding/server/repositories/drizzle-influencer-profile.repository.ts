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

  const [socialProfile] = await transaction
    .select()
    .from(socialProfiles)
    .where(
      and(
        eq(socialProfiles.ownerAccountId, accountId),
        isNull(socialProfiles.archivedAt),
      ),
    )
    .orderBy(socialProfiles.sortOrder, socialProfiles.id)
    .limit(1);
  const [metric] = await transaction
    .select()
    .from(creatorMetricSnapshots)
    .where(
      and(
        eq(creatorMetricSnapshots.creatorProfileId, profile.id),
        eq(creatorMetricSnapshots.socialProfileId, socialProfile.id),
        eq(creatorMetricSnapshots.platform, socialProfile.platform),
      ),
    )
    .orderBy(
      desc(creatorMetricSnapshots.observedOn),
      desc(creatorMetricSnapshots.createdAt),
      desc(creatorMetricSnapshots.id),
    )
    .limit(1);
  const selectedNiches = await transaction
    .select({ id: niches.id, name: niches.name, slug: niches.slug })
    .from(creatorNiches)
    .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
    .where(eq(creatorNiches.creatorProfileId, profile.id))
    .orderBy(niches.sortOrder, niches.slug);

  if (!socialProfile || !metric) {
    return null;
  }

  const nicheSelection = mapCreatorNicheSelection(selectedNiches);

  return {
    avatarAssetId: profile.avatarAssetId,
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    coverAssetId: profile.coverAssetId,
    creatorType: profile.creatorType,
    displayName: profile.displayName,
    engagementRate: Number(metric.engagementRate ?? 0),
    followers: metric.followerCount ?? 0,
    legalName: profile.legalName,
    nicheSlugs: nicheSelection.nicheSlugs,
    otherNiche: nicheSelection.otherNiche,
    socialPlatform: socialProfile.platform,
    socialUrl: socialProfile.normalizedUrl,
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
  const [currentSocial] = await transaction
    .select()
    .from(socialProfiles)
    .where(
      and(
        eq(socialProfiles.ownerAccountId, accountId),
        isNull(socialProfiles.archivedAt),
      ),
    )
    .orderBy(socialProfiles.sortOrder, socialProfiles.id)
    .limit(1)
    .for("update");
  const [socialProfile] = currentSocial
    ? await transaction
        .update(socialProfiles)
        .set({
          normalizedUrl: input.socialUrl,
          platform: input.socialPlatform,
        })
        .where(eq(socialProfiles.id, currentSocial.id))
        .returning({ id: socialProfiles.id })
    : await transaction
        .insert(socialProfiles)
        .values({
          normalizedUrl: input.socialUrl,
          ownerAccountId: accountId,
          platform: input.socialPlatform,
        })
        .returning({ id: socialProfiles.id });

  if (!socialProfile) {
    throw new Error("Influencer social profile update failed.");
  }

  const observedOn = new Date();
  const [todayMetric] = await transaction
    .select({ id: creatorMetricSnapshots.id })
    .from(creatorMetricSnapshots)
    .where(
      and(
        eq(creatorMetricSnapshots.creatorProfileId, profileId),
        eq(creatorMetricSnapshots.socialProfileId, socialProfile.id),
        eq(creatorMetricSnapshots.platform, input.socialPlatform),
        eq(creatorMetricSnapshots.observedOn, observedOn),
      ),
    )
    .limit(1)
    .for("update");

  if (todayMetric) {
    await transaction
      .update(creatorMetricSnapshots)
      .set({
        engagementRate: input.engagementRate.toString(),
        followerCount: input.followers,
      })
      .where(eq(creatorMetricSnapshots.id, todayMetric.id));
    return;
  }

  await transaction.insert(creatorMetricSnapshots).values({
    creatorProfileId: profileId,
    engagementRate: input.engagementRate.toString(),
    followerCount: input.followers,
    observedOn,
    platform: input.socialPlatform,
    socialProfileId: socialProfile.id,
  });
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
          displayName: input.displayName,
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
      await persistCurrentAccountProfileCompletion(
        transaction,
        accountId,
        "INFLUENCER",
      );

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
