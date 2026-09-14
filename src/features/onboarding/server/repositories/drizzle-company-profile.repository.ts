import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { companyLocations, companyProfiles, socialProfiles } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";

import { SOCIAL_CHANNEL_PLATFORMS } from "../../domain/social-channels-form-data";
import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import type { CompanyProfileDto } from "../../types/company-profile.types";
import type { CompanyProfileRepository } from "../services/company-profile.service";
import { persistCurrentAccountProfileCompletion } from "./drizzle-profile-completion.repository";

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/gu, "");
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

/**
 * Channels declared before the fixed-platform picker (e.g. a custom "Outra"
 * network) aren't representable in the current form and are intentionally
 * left out of the edit view — `updateCompanySocial` never archives them, so
 * they stay exactly as stored and keep appearing in the catalog.
 */
function isManageableSocialChannel<T extends { platform: string }>(
  socialProfile: T,
): socialProfile is T & {
  platform: (typeof SOCIAL_CHANNEL_PLATFORMS)[number];
} {
  return (SOCIAL_CHANNEL_PLATFORMS as readonly string[]).includes(
    socialProfile.platform,
  );
}

async function loadProfile(
  transaction: ApplicationTransaction,
  accountId: string,
): Promise<CompanyProfileDto | null> {
  const [profile] = await transaction
    .select()
    .from(companyProfiles)
    .where(
      and(
        eq(companyProfiles.accountId, accountId),
        isNull(companyProfiles.archivedAt),
      ),
    )
    .limit(1);

  if (!profile) {
    return null;
  }

  const locations = await transaction
    .select()
    .from(companyLocations)
    .where(
      and(
        eq(companyLocations.companyProfileId, profile.id),
        isNull(companyLocations.archivedAt),
      ),
    )
    .orderBy(desc(companyLocations.isPrimary), asc(companyLocations.id));
  const primaryLocation = locations.find((location) => location.isPrimary);
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

  if (!primaryLocation) {
    return null;
  }

  return {
    additionalLocations: locations
      .filter((location) => !location.isPrimary)
      .map((location) => ({
        city: location.city,
        complement: location.complement ?? "",
        label: location.label,
        neighborhood: location.neighborhood ?? "",
        number: location.number,
        postalCode: location.postalCode ?? "",
        state: location.state,
        street: location.street,
      })),
    city: primaryLocation.city,
    cnpj: profile.cnpj,
    complement: primaryLocation.complement ?? "",
    coverAssetId: profile.coverAssetId,
    description: profile.description ?? "",
    employeeRange: profile.employeeRange as CompanyProfileDto["employeeRange"],
    isCdlMember: profile.isCdlMember,
    legalName: profile.legalName,
    logoAssetId: profile.logoAssetId,
    neighborhood: primaryLocation.neighborhood ?? "",
    number: primaryLocation.number,
    postalCode: primaryLocation.postalCode ?? "",
    segment: profile.segment ?? "",
    socialChannels: ownedSocialProfiles
      .filter(isManageableSocialChannel)
      .map((socialProfile) => ({
        followerCount: 0,
        isPrimary: socialProfile.isPrimary,
        platform: socialProfile.platform,
        url: socialProfile.normalizedUrl,
      })),
    state: primaryLocation.state,
    street: primaryLocation.street,
    tradeName: profile.tradeName,
    version: profile.version,
    websiteUrl: profile.websiteUrl ?? undefined,
    whatsapp: profile.whatsappE164 ?? "",
  };
}

async function replaceAdditionalLocations(
  transaction: ApplicationTransaction,
  profileId: string,
  input: CompanyProfileEditInput,
) {
  await transaction
    .update(companyLocations)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(companyLocations.companyProfileId, profileId),
        eq(companyLocations.isPrimary, false),
        isNull(companyLocations.archivedAt),
      ),
    );

  if (input.additionalLocations.length === 0) {
    return;
  }

  await transaction.insert(companyLocations).values(
    input.additionalLocations.map((location) => ({
      city: location.city,
      companyProfileId: profileId,
      complement: location.complement || null,
      isPrimary: false,
      label: location.label,
      neighborhood: location.neighborhood,
      number: location.number,
      postalCode: location.postalCode,
      state: location.state,
      street: location.street,
    })),
  );
}

async function updateCompanySocial(
  transaction: ApplicationTransaction,
  accountId: string,
  input: CompanyProfileEditInput,
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
   * A channel on a platform the picker doesn't offer isn't representable in
   * `input.socialChannels` at all, so it must never be archived just because
   * it's absent from the request.
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
      continue;
    }

    await transaction.insert(socialProfiles).values({
      isPrimary: channel.isPrimary,
      normalizedUrl: channel.url,
      ownerAccountId: accountId,
      platform: channel.platform,
    });
  }
}

export function createDrizzleCompanyProfileRepository(): CompanyProfileRepository {
  return {
    loadApprovedProfile: loadProfile,

    async updateApprovedProfile(
      transaction,
      accountId,
      input,
      requestId,
      auditReason = "Update approved company profile",
      auditContext,
      persistCompletion = true,
    ) {
      const [currentProfile] = await transaction
        .select({
          id: companyProfiles.id,
          version: companyProfiles.version,
        })
        .from(companyProfiles)
        .where(
          and(
            eq(companyProfiles.accountId, accountId),
            isNull(companyProfiles.archivedAt),
          ),
        )
        .limit(1)
        .for("update");

      if (!currentProfile) {
        throw new Error("Approved company profile was not found.");
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
          actorRole: "COMPANY",
          actorType: "USER",
          reason: auditReason,
          requestId,
          source: "APPLICATION",
        },
      );

      const [updatedProfile] = await transaction
        .update(companyProfiles)
        .set({
          cnpj: input.cnpj,
          description: input.description,
          employeeRange: input.employeeRange,
          isCdlMember: input.isCdlMember,
          legalName: input.legalName,
          segment: input.segment,
          tradeName: input.tradeName,
          websiteUrl: input.websiteUrl,
          whatsappE164: normalizeWhatsapp(input.whatsapp),
        })
        .where(
          and(
            eq(companyProfiles.id, currentProfile.id),
            eq(companyProfiles.version, input.expectedVersion),
          ),
        )
        .returning({ id: companyProfiles.id });

      if (!updatedProfile) {
        return {
          currentVersion: currentProfile.version,
          kind: "conflict",
        };
      }

      const [primaryLocation] = await transaction
        .select({ id: companyLocations.id })
        .from(companyLocations)
        .where(
          and(
            eq(companyLocations.companyProfileId, currentProfile.id),
            eq(companyLocations.isPrimary, true),
            isNull(companyLocations.archivedAt),
          ),
        )
        .limit(1)
        .for("update");

      if (!primaryLocation) {
        throw new Error("Primary company location was not found.");
      }

      await transaction
        .update(companyLocations)
        .set({
          city: input.city,
          complement: input.complement || null,
          neighborhood: input.neighborhood,
          number: input.number,
          postalCode: input.postalCode,
          state: input.state,
          street: input.street,
        })
        .where(eq(companyLocations.id, primaryLocation.id));
      await replaceAdditionalLocations(transaction, currentProfile.id, input);
      await updateCompanySocial(transaction, accountId, input);
      if (persistCompletion) {
        await persistCurrentAccountProfileCompletion(
          transaction,
          accountId,
          "COMPANY",
        );
      }

      const profile = await loadProfile(transaction, accountId);
      if (!profile) {
        throw new Error("Updated company profile could not be loaded.");
      }

      return {
        kind: "updated",
        profile,
      };
    },
  };
}
