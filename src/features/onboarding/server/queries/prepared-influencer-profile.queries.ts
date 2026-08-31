import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { CreatorOnboardingDraftPayload } from "../../schemas/onboarding-draft-schema";
import { createDrizzleInfluencerProfileRepository } from "../repositories/drizzle-influencer-profile.repository";

export async function loadCurrentPreparedInfluencerProfile(): Promise<CreatorOnboardingDraftPayload | null> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, context) => {
      if (context.role !== "INFLUENCER" || context.status !== "ONBOARDING") {
        return null;
      }

      const profile =
        await createDrizzleInfluencerProfileRepository().loadApprovedProfile(
          transaction,
          context.accountId,
        );
      if (!profile) {
        return null;
      }

      const { avatarAssetId, coverAssetId, version, ...initialValues } =
        profile;
      void avatarAssetId;
      void coverAssetId;
      void version;
      return initialValues;
    },
  );
}
