import "server-only";
import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { ApplicationTransaction } from "@/db/client";
import { accounts, creatorProfiles } from "@/db/schema";
export function findEligibleCreators(
  transaction: ApplicationTransaction,
  search: string,
  selectedId?: string,
) {
  const escaped = search.replace(/[\\%_]/g, "\\$&");
  return transaction
    .select({
      id: creatorProfiles.id,
      displayName: creatorProfiles.displayName,
      city: creatorProfiles.city,
      state: creatorProfiles.state,
      avatarAssetId: creatorProfiles.avatarAssetId,
    })
    .from(creatorProfiles)
    .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
    .where(
      and(
        eq(accounts.role, "INFLUENCER"),
        eq(accounts.status, "APPROVED"),
        eq(accounts.completionPercentage, 100),
        isNull(accounts.archivedAt),
        isNull(creatorProfiles.archivedAt),
        or(
          ilike(creatorProfiles.displayName, `%${escaped}%`),
          selectedId ? eq(creatorProfiles.id, selectedId) : undefined,
        ),
      ),
    )
    .orderBy(
      ...(selectedId ? [desc(eq(creatorProfiles.id, selectedId))] : []),
      asc(creatorProfiles.displayName),
      asc(creatorProfiles.id),
    )
    .limit(20);
}
