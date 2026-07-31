import "server-only";

import { createDatabaseClient } from "@/db/client";
import { buildAuthCallbackUrl } from "@/features/identity/domain/auth-return-path";
import { createAuditedTransactionRunner } from "@/features/audit/server/services/audited-transaction";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createDrizzleAdminProvisioningRepository } from "../repositories/drizzle-admin-provisioning.repository";
import { createAdminProvisioningService } from "./admin-provisioning.service";
import { createProductionAdminBootstrapService } from "./production-admin-bootstrap.service";
import { createSupabaseAdminIdentityGateway } from "./supabase-admin-identity.gateway";

export function createAdminIdentityGateway() {
  const environment = parseServerEnv(process.env);

  return createSupabaseAdminIdentityGateway(createSupabaseAdminClient(), {
    redirectTo: buildAuthCallbackUrl(
      environment.NEXT_PUBLIC_APP_URL,
      "/reset-password",
    ),
  });
}

export function createInitialAdminBootstrapService() {
  const environment = parseServerEnv(process.env);
  const directClient = createDatabaseClient(environment.DIRECT_URL);
  const repository = createDrizzleAdminProvisioningRepository({
    database: directClient.database,
    runBootstrapTransaction: createAuditedTransactionRunner(
      directClient.database,
    ),
  });
  const identity = createAdminIdentityGateway();
  const service = createAdminProvisioningService({
    bootstrapInitialAdmin: (input) => repository.bootstrapInitialAdmin(input),
    findIdentityByEmail: (email) => repository.findIdentityByEmail(email),
    inspectInitialAdmin: (identityId) =>
      repository.inspectInitialAdmin(identityId),
    inviteIdentity: (email) => identity.inviteIdentity(email),
    provisionAdditionalAdmin: () => {
      throw new Error(
        "Additional administrators require an authenticated server flow.",
      );
    },
    resolveCurrentSession: () => {
      throw new Error(
        "Initial administrator bootstrap has no user session context.",
      );
    },
  });
  const productionService = createProductionAdminBootstrapService({
    bootstrapApprovedAdmin: (input) =>
      repository.bootstrapInitialAdmin({
        ...input,
        allowExistingAdmins: true,
      }),
    findIdentityByEmail: (email) => repository.findIdentityByEmail(email),
    preparePasswordIdentity: (input) => identity.preparePasswordIdentity(input),
    seedExistingPassword: (input) => identity.seedExistingPassword(input),
  });

  return {
    close: () => directClient.client.end({ timeout: 2 }),
    productionService,
    service,
  };
}
