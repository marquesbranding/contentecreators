import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { accounts } from "@/db/schema";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { CorrectedProfileResubmissionCommand } from "../../schemas/corrected-profile-resubmission-schema";
import type { OnboardingDraftPayload } from "../../types/onboarding-draft.types";
import { createDrizzleCompanyProfileRepository } from "../repositories/drizzle-company-profile.repository";
import { createDrizzleInfluencerProfileRepository } from "../repositories/drizzle-influencer-profile.repository";

export interface CorrectedProfileResubmissionContext {
  command: CorrectedProfileResubmissionCommand;
  initialValues: OnboardingDraftPayload;
}

export async function loadCurrentCorrectionContext(): Promise<CorrectedProfileResubmissionContext | null> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { requestId: crypto.randomUUID() },
    async (transaction, context) => {
      if (
        context.status !== "CHANGES_REQUESTED" ||
        (context.role !== "INFLUENCER" && context.role !== "COMPANY")
      ) {
        return null;
      }

      const [account] = await transaction
        .select({ version: accounts.version })
        .from(accounts)
        .where(
          and(eq(accounts.id, context.accountId), isNull(accounts.archivedAt)),
        )
        .limit(1);

      if (!account) {
        return null;
      }

      if (context.role === "INFLUENCER") {
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

        return {
          command: {
            expectedAccountVersion: account.version,
            expectedProfileVersion: version,
            idempotencyKey: crypto.randomUUID(),
          },
          initialValues,
        };
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

      return {
        command: {
          expectedAccountVersion: account.version,
          expectedProfileVersion: version,
          idempotencyKey: crypto.randomUUID(),
        },
        initialValues,
      };
    },
  );
}
