import "server-only";

import { getDatabaseClient } from "@/db/client";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import { createServerEmailDeliveryProcessor } from "@/features/communications/server";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";
import { getServerEnv } from "@/shared/server/env";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import {
  createStatelessPublishableClient,
  createSupabaseAccountDeletionIdentityGateway,
} from "../gateways/supabase-account-deletion-identity.gateway";
import { createDrizzleAccountDeletionRepository } from "../repositories/drizzle-account-deletion.repository";
import { createAccountDeletionService } from "./account-deletion.service";

export async function createServerAccountDeletionService() {
  const env = getServerEnv();
  const { database } = getDatabaseClient();
  const processor = createServerEmailDeliveryProcessor();

  return createAccountDeletionService({
    applyAuditContext: applyVerifiedAuditContext,
    deliverEmail: async (delivery) => {
      await processor.processOne(delivery);
    },
    identity: createSupabaseAccountDeletionIdentityGateway({
      adminClient: createSupabaseAdminClient(),
      publishableClient: createStatelessPublishableClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      sessionClient: await createServerSupabaseClient(),
    }),
    repository: createDrizzleAccountDeletionRepository(database),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
