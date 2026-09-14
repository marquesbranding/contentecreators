import { and, inArray, isNull, lt, or } from "drizzle-orm";

import { createDatabaseClient } from "../src/db/client";
import { accounts } from "../src/db/schema";
import { PROFILE_COMPLETION_VERSION } from "../src/features/onboarding/domain/profile-completion";
import { persistProfileCompletionDirect } from "../src/features/onboarding/server/repositories/drizzle-profile-completion.repository";
import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";

/**
 * Recomputes and persists `accounts.completion_percentage` for every
 * INFLUENCER/COMPANY account still on an older completion calculator
 * version (see `PROFILE_COMPLETION_VERSION`). Weight changes only take
 * effect for an account the next time it saves its profile — this backfills
 * everyone else so a weight change (e.g. removing a field) doesn't leave
 * stale percentages until an unrelated edit happens to touch that account.
 *
 * Usage:
 *   npx tsx scripts/recalculate-profile-completion.ts           (dry run)
 *   npx tsx scripts/recalculate-profile-completion.ts --execute (writes)
 */
async function main() {
  const execute = process.argv.includes("--execute");
  const environment = parseServerEnv(process.env);
  const { client, database } = createDatabaseClient(environment.DATABASE_URL);

  try {
    const staleAccounts = await database
      .select({ id: accounts.id, role: accounts.role })
      .from(accounts)
      .where(
        and(
          inArray(accounts.role, ["INFLUENCER", "COMPANY"]),
          or(
            lt(accounts.completionVersion, PROFILE_COMPLETION_VERSION),
            isNull(accounts.completionVersion),
          ),
        ),
      );

    console.log(
      `Found ${staleAccounts.length} account(s) on an older completion version.`,
    );

    if (!execute) {
      console.log("Dry run — pass --execute to write the recalculated values.");
      return;
    }

    let updated = 0;

    for (const account of staleAccounts) {
      if (account.role !== "INFLUENCER" && account.role !== "COMPANY") {
        continue;
      }

      await database.transaction(async (transaction) => {
        await persistProfileCompletionDirect(
          transaction,
          account.id,
          account.role as "INFLUENCER" | "COMPANY",
        );
      });
      updated += 1;
    }

    console.log(`Recalculated completion for ${updated} account(s).`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
