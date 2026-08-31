import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { CompanyOnboardingDraftPayload } from "../../schemas/onboarding-draft-schema";
import { createDrizzleCompanyProfileRepository } from "../repositories/drizzle-company-profile.repository";

export async function loadCurrentPreparedCompanyProfile(): Promise<CompanyOnboardingDraftPayload | null> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, context) => {
      if (context.role !== "COMPANY" || context.status !== "ONBOARDING") {
        return null;
      }

      const profile =
        await createDrizzleCompanyProfileRepository().loadApprovedProfile(
          transaction,
          context.accountId,
        );
      if (!profile) {
        return null;
      }

      const { coverAssetId, logoAssetId, version, ...initialValues } = profile;
      void coverAssetId;
      void logoAssetId;
      void version;
      return initialValues;
    },
  );
}
