import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { calculateProfileCompletionForAccount } from "../repositories/drizzle-profile-completion.repository";

export async function loadCurrentProfileCompletion() {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { requestId: crypto.randomUUID() },
    async (transaction, account) => {
      if (account.role !== "INFLUENCER" && account.role !== "COMPANY") {
        throw new Error("Account does not own a participant profile.");
      }

      return calculateProfileCompletionForAccount(
        transaction,
        account.accountId,
        account.role,
      );
    },
  );
}
