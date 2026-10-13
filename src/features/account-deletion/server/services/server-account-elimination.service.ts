import "server-only";

import { getDatabaseClient } from "@/db/client";
import { withAuditedTransaction } from "@/features/audit/server";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

import {
  createStatelessPublishableClient,
  createSupabaseAccountDeletionIdentityGateway,
} from "../gateways/supabase-account-deletion-identity.gateway";
import { createDrizzleAccountDeletionRepository } from "../repositories/drizzle-account-deletion.repository";
import { createAccountEliminationService } from "./account-elimination.service";
import { getServerEnv } from "@/shared/server/env";

export function createServerAccountEliminationService() {
  const env = getServerEnv();
  const adminClient = createSupabaseAdminClient();
  const gateway = createSupabaseAccountDeletionIdentityGateway({
    adminClient,
    publishableClient: createStatelessPublishableClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    // The routine has no browser session; the session client is never used.
    sessionClient: adminClient,
  });

  return createAccountEliminationService({
    identity: gateway,
    log: ({ event, level, requestId, ...details }) =>
      operationalLogger[level]({
        details: { name: event, ...details },
        event: "account_lifecycle",
        operation: "account_elimination",
        outcome: level === "error" ? "failed" : "success",
        requestId,
      }),
    repository: createDrizzleAccountDeletionRepository(
      getDatabaseClient().database,
    ),
    runSystemTransaction: withAuditedTransaction,
  });
}
