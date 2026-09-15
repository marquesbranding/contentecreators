import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { accounts, onboardingDrafts, mediaAssets } from "@/db/schema";
import { withAuditedTransaction } from "@/features/audit/server";
import type { z } from "zod";
import type { registrationAccountSchema } from "../../schemas/registration-account-schema";

export async function saveRegistrationAccount(
  identityId: string,
  input: z.infer<typeof registrationAccountSchema>,
) {
  return withAuditedTransaction(
    {
      actorAccountId: null,
      actorRole: null,
      actorType: "SYSTEM",
      reason: "Save verified registration account",
      requestId: crypto.randomUUID(),
      source: "AUTH_HOOK",
    },
    async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${identityId}, 0))`,
      );
      const role = input.accountType === "COMPANY" ? "COMPANY" : "INFLUENCER";
      const [account] = await transaction
        .update(accounts)
        .set({ role, fullName: input.fullName, registrationStep: "PROFILE" })
        .where(
          and(
            eq(accounts.authUserId, identityId),
            eq(accounts.status, "ONBOARDING"),
            isNull(accounts.archivedAt),
            eq(accounts.registrationStep, "ACCOUNT_DETAILS"),
            sql`${accounts.role} is null`,
          ),
        )
        .returning();
      if (!account) throw new Error("Registration account already completed");
      if (role === "COMPANY")
        await transaction
          .update(mediaAssets)
          .set({ kind: "LOGO" })
          .where(
            and(
              eq(mediaAssets.ownerAccountId, account.id),
              eq(mediaAssets.kind, "AVATAR"),
              eq(mediaAssets.status, "PENDING"),
            ),
          );
      const payload =
        role === "COMPANY"
          ? { whatsapp: input.whatsapp }
          : {
              whatsapp: input.whatsapp,
              legalName: input.fullName,
              creatorType: input.accountType,
            };
      await transaction
        .insert(onboardingDrafts)
        .values({ accountId: account.id, role, payload })
        .onConflictDoUpdate({
          target: onboardingDrafts.accountId,
          set: { role, payload },
        });
      return role;
    },
  );
}
