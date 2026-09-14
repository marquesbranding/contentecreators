import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { companyProfiles, creatorProfiles } from "@/db/schema";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

/**
 * Detail routes still exclude the viewer's own profile from the eligible
 * result (`findEligibleCatalogCreator`/company equivalent), so opening the
 * URL directly would otherwise read as a plain 404. This lets the route
 * redirect to "Meu perfil" instead.
 */
export async function isOwnCreatorProfile(creatorId: string): Promise<boolean> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, account) => {
      const [profile] = await transaction
        .select({ accountId: creatorProfiles.accountId })
        .from(creatorProfiles)
        .where(
          and(
            eq(creatorProfiles.id, creatorId),
            isNull(creatorProfiles.archivedAt),
          ),
        )
        .limit(1);

      return profile?.accountId === account.accountId;
    },
  );
}

export async function isOwnCompanyProfile(companyId: string): Promise<boolean> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, account) => {
      const [profile] = await transaction
        .select({ accountId: companyProfiles.accountId })
        .from(companyProfiles)
        .where(
          and(
            eq(companyProfiles.id, companyId),
            isNull(companyProfiles.archivedAt),
          ),
        )
        .limit(1);

      return profile?.accountId === account.accountId;
    },
  );
}
