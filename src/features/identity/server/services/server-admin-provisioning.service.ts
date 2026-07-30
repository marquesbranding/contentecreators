import "server-only";

import { resolveFreshServerCurrentSession } from "../dal/current-account";
import { createServerAdminProvisioningRepository } from "../repositories/drizzle-admin-provisioning.repository";
import { createAdminProvisioningService } from "./admin-provisioning.service";
import { createAdminIdentityGateway } from "./initial-admin-bootstrap.service";

export async function createServerAdminProvisioningService() {
  const repository = await createServerAdminProvisioningRepository();
  const identity = createAdminIdentityGateway();

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
