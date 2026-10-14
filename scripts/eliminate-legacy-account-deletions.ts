import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { createDatabaseClient } from "../src/db/client";
import {
  createStatelessPublishableClient,
  createSupabaseAccountDeletionIdentityGateway,
} from "../src/features/account-deletion/server/gateways/supabase-account-deletion-identity.gateway";
import { createDrizzleAccountDeletionRepository } from "../src/features/account-deletion/server/repositories/drizzle-account-deletion.repository";
import {
  assertExecuteAllowed,
  createAccountEliminationService,
  fingerprintCandidates,
} from "../src/features/account-deletion/server/services/account-elimination.service";
import { createStorageCleanup } from "../src/features/account-deletion/server/services/storage-cleanup.service";
import { createAuditedTransactionRunner } from "../src/features/audit/server/services/audited-transaction";
import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";

/**
 * Migrates accounts left by the retired 30-day deletion flow to the immediate
 * deletion (OpenSpec apply-client-review-r04, task 12.9):
 *
 * - REQUESTED / FAILED accounts: lift the Auth ban the old flow applied (unless
 *   the login still owns a BANNED account), then erase through
 *   `app_eliminate_account_data()` (same disposition matrix as the self-service
 *   deletion) and remove the queued Storage objects;
 * - old ELIMINATED tombstones still holding the login: lift the ban and unlink.
 *
 * Deliberately NOT a migration: REQUESTED accounts were still inside their
 * recovery window, so eliminating them is irreversible and needs the list
 * confirmed with the client first (task 12.2). Output carries account ids and
 * counts only, never names, e-mails or paths.
 *
 * Usage:
 *   npm run accounts:eliminate-legacy
 *       dry run: prints the counts, ids and the candidate fingerprint
 *   npm run accounts:eliminate-legacy -- --execute --confirmed-with-client --fingerprint=<fingerprint of the dry run>
 *       executes; always requires both flags, in every environment, and refuses
 *       when the candidate set differs from the one printed by the dry run
 *       (see assertExecuteAllowed). Production is also detected by the Supabase URL.
 */
async function main() {
  const execute = process.argv.includes("--execute");
  const confirmed = process.argv.includes("--confirmed-with-client");
  const fingerprintArgument = process.argv
    .find((argument) => argument.startsWith("--fingerprint="))
    ?.slice("--fingerprint=".length);
  const environment = parseServerEnv(process.env);
  const requestId = `legacy-account-deletion:${randomUUID()}`;
  const { client, database } = createDatabaseClient(environment.DATABASE_URL);

  try {
    const repository = createDrizzleAccountDeletionRepository(database);
    const legacy = await repository.listLegacyAccounts();
    const byState = legacy.reduce<Record<string, number>>((totals, account) => {
      totals[account.deletionState] = (totals[account.deletionState] ?? 0) + 1;

      return totals;
    }, {});

    console.log(
      `[${environment.APP_ENV}] ${legacy.length} legacy account(s): ${JSON.stringify(byState)}`,
    );
    for (const account of legacy) {
      console.log(`  ${account.deletionState.padEnd(10)} ${account.id}`);
    }

    // Always computed from the database, for both modes: the execution must
    // erase exactly the set the dry run printed and the client approved.
    const candidateFingerprint = fingerprintCandidates(
      legacy.map((account) => account.id),
      false,
    );

    if (!execute) {
      console.log(`Candidate fingerprint: ${candidateFingerprint}`);
      console.log(
        "Dry run. To execute after client confirmation: --execute --confirmed-with-client " +
          `--fingerprint=${candidateFingerprint}`,
      );
      return;
    }

    try {
      assertExecuteAllowed({
        appEnvironment: environment.APP_ENV,
        candidateFingerprint,
        confirmedWithClient: confirmed,
        execute,
        fingerprint: fingerprintArgument,
        supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL,
      });
    } catch (error) {
      console.error(
        `Refused: ${error instanceof Error ? error.message : "gate failed"}`,
      );
      process.exitCode = 1;
      return;
    }

    const adminClient = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const gateway = createSupabaseAccountDeletionIdentityGateway({
      adminClient,
      publishableClient: createStatelessPublishableClient(
        environment.NEXT_PUBLIC_SUPABASE_URL,
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      sessionClient: adminClient,
    });
    const service = createAccountEliminationService({
      identity: gateway,
      repository,
      runSystemTransaction: (context, work) =>
        createAuditedTransactionRunner(database)(
          { ...context, source: "SCRIPT" },
          work,
        ),
      storage: createStorageCleanup({ identity: gateway, repository }),
    });

    let failures = 0;

    for (const account of legacy) {
      const result = await service.eliminateLegacyAccount(account, requestId);

      if (result.outcome !== "eliminated") {
        failures += 1;
      }

      console.log(
        `  ${result.outcome.padEnd(16)} ${account.id}${
          result.storage
            ? ` (storage removed ${result.storage.removed}, queued ${result.storage.failed})`
            : ""
        }`,
      );
    }

    console.log(
      `Done: ${legacy.length - failures} migrated, ${failures} failed (request ${requestId}).`,
    );
    process.exitCode = failures > 0 ? 1 : 0;
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
