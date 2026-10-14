import "server-only";

import { getDatabaseClient } from "@/db/client";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import { createServerEmailDeliveryProcessor } from "@/features/communications/server";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";
import { getServerEnv } from "@/shared/server/env";
import { operationalLogger } from "@/shared/server/observability/operational-logger";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import {
  createStatelessPublishableClient,
  createSupabaseAccountDeletionIdentityGateway,
} from "../gateways/supabase-account-deletion-identity.gateway";
import { createDrizzleAccountDeletionRepository } from "../repositories/drizzle-account-deletion.repository";
import { createAccountDeletionService } from "./account-deletion.service";
import { createStorageCleanup } from "./storage-cleanup.service";

export async function createServerAccountDeletionService() {
  const env = getServerEnv();
  const { database } = getDatabaseClient();
  const processor = createServerEmailDeliveryProcessor();
  const repository = createDrizzleAccountDeletionRepository(database);
  const identity = createSupabaseAccountDeletionIdentityGateway({
    adminClient: createSupabaseAdminClient(),
    publishableClient: createStatelessPublishableClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    sessionClient: await createServerSupabaseClient(),
  });

  return createAccountDeletionService({
    applyAuditContext: applyVerifiedAuditContext,
    deliverEmail: async (delivery) => {
      await processor.processOne(delivery);
    },
    identity,
    log: ({ event, level, requestId, ...details }) =>
      operationalLogger[level]({
        details: { name: event, ...details },
        event: "account_lifecycle",
        operation: "account_deletion",
        outcome: level === "info" ? "success" : "failed",
        requestId,
      }),
    repository,
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
    storage: createStorageCleanup({ identity, repository }),
  });
}
