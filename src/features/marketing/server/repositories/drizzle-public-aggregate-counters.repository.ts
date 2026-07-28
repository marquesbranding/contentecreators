import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import { accounts } from "@/db/schema";

import type { ApprovedPublicCounts } from "../../types/public-aggregate-counters.types";

export async function loadApprovedPublicCounts(
  database: ApplicationDatabase,
): Promise<ApprovedPublicCounts> {
  const [counts] = await database
    .select({
      approvedCompanies: sql<number>`
        count(*) filter (where ${accounts.role} = 'COMPANY')::integer
      `,
      approvedCreators: sql<number>`
        count(*) filter (where ${accounts.role} = 'INFLUENCER')::integer
      `,
    })
    .from(accounts)
    .where(and(eq(accounts.status, "APPROVED"), isNull(accounts.archivedAt)));

  return {
    approvedCompanies: counts?.approvedCompanies ?? 0,
    approvedCreators: counts?.approvedCreators ?? 0,
  };
}

export function loadServerApprovedPublicCounts() {
  return loadApprovedPublicCounts(getDatabaseClient().database);
}
