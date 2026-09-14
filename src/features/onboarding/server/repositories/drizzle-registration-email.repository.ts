import "server-only";

import { and, inArray, isNull, sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import { accounts } from "@/db/schema";

/**
 * Any company or creator account — onboarding, in review or approved — owns
 * its e-mail. Admin-only accounts are left out so an administrator can still
 * register a linked profile with the same identity.
 */
export function createRegisteredProfileEmailLookup(
  database: ApplicationDatabase = getDatabaseClient().database,
) {
  return async function hasRegisteredProfile(email: string) {
    const [match] = await database
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          sql`lower(${accounts.operationalEmail}) = ${email.toLowerCase()}`,
          inArray(accounts.role, ["COMPANY", "INFLUENCER"]),
          isNull(accounts.archivedAt),
        ),
      )
      .limit(1);

    return Boolean(match);
  };
}
