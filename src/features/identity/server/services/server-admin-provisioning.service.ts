import "server-only";

import { createDatabaseClient } from "@/db/client";
import { createAuditedTransactionRunner } from "@/features/audit/server";
import { buildAuthCallbackUrl } from "@/features/identity/domain/auth-return-path";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { resolveFreshServerCurrentSession } from "../dal/current-account";
import {
  createDrizzleAdminProvisioningRepository,
  createServerAdminProvisioningRepository,
} from "../repositories/drizzle-admin-provisioning.repository";
import { createAdminProvisioningService } from "./admin-provisioning.service";
import { createSupabaseAdminIdentityGateway } from "./supabase-admin-identity.gateway";

function createIdentityGateway() {
  const environment = parseServerEnv(process.env);

  return createSupabaseAdminIdentityGateway(createSupabaseAdminClient(), {
    redirectTo: buildAuthCallbackUrl(
      environment.NEXT_PUBLIC_APP_URL,
      "/reset-password",
    ),
  });
}

export async function createServerAdminProvisioningService() {
  const repository = await createServerAdminProvisioningRepository();
  const identity = createIdentityGateway();

  return createAdminProvisioningService({
    bootstrapInitialAdmin: (input) => repository.bootstrapInitialAdmin(input),
    findIdentityByEmail: (email) => repository.findIdentityByEmail(email),
    inspectInitialAdmin: (identityId) =>
      repository.inspectInitialAdmin(identityId),
    inviteIdentity: (email) => identity.inviteIdentity(email),
    provisionAdditionalAdmin: (input) =>
      repository.provisionAdditionalAdmin(input),
    resolveCurrentSession: resolveFreshServerCurrentSession,
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
  const identity = createIdentityGateway();
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

  return {
    close: () => directClient.client.end({ timeout: 2 }),
    service,
  };
}
