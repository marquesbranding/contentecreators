import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { InfluencerProfileDto } from "../../types/influencer-profile.types";
import { createDrizzleInfluencerProfileRepository } from "../repositories/drizzle-influencer-profile.repository";

/**
 * Unlike loadCurrentInfluencerProfile (APPROVED-only, used by the live
 * profile edit page), this reads the same profile row while the account is
 * still ONBOARDING/PENDING_REVIEW/CHANGES_REQUESTED — needed by the
 * "cadastro em análise" status page's live preview header.
 */
export async function loadCurrentInfluencerReviewProfile(): Promise<InfluencerProfileDto | null> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, context) => {
      if (
        context.role !== "INFLUENCER" ||
        (context.status !== "ONBOARDING" &&
          context.status !== "CHANGES_REQUESTED" &&
          context.status !== "PENDING_REVIEW" &&
          context.status !== "APPROVED")
      ) {
        return null;
      }

      return createDrizzleInfluencerProfileRepository().loadApprovedProfile(
        transaction,
        context.accountId,
      );
    },
  );
}
