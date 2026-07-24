import { describe, expect, it, vi } from "vitest";

import type { CurrentSessionDto } from "../../types/current-account.types";
import {
  createAdminProvisioningService,
  type AdminProvisioningDependencies,
} from "./admin-provisioning.service";

const adminSession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000001",
    role: "ADMIN",
    status: "APPROVED",
  },
  kind: "authenticated",
};

const companySession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000002",
    role: "COMPANY",
    status: "APPROVED",
  },
  kind: "authenticated",
};

const invitedIdentity = {
  email: "admin.novo@example.com",
  id: "20000000-0000-4000-8000-000000000009",
};

function createDependencies(
  overrides: Partial<AdminProvisioningDependencies> = {},
): AdminProvisioningDependencies {
  return {
    bootstrapInitialAdmin: vi.fn(async () => ({
      accountId: "b0000000-0000-4000-8000-000000000009",
      kind: "provisioned" as const,
    })),
    findIdentityByEmail: vi.fn(async () => null),
    inspectInitialAdmin: vi.fn(async () => ({
      kind: "available" as const,
    })),
    inviteIdentity: vi.fn(async () => invitedIdentity),
    provisionAdditionalAdmin: vi.fn(async () => ({
      accountId: "b0000000-0000-4000-8000-000000000009",
      kind: "provisioned" as const,
    })),
    resolveCurrentSession: vi.fn(async () => adminSession),
    ...overrides,
  };
}

describe("admin provisioning service", () => {
  it("keeps initial bootstrap dry-run free of Auth and database mutations", async () => {
    const dependencies = createDependencies();
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.bootstrapInitial({
        approvalReference: "CLIENTE-ADMIN-2026-01",
        email: " ADMIN.NOVO@example.com ",
        mode: "DRY_RUN",
        requestId: "initial-admin-dry-run",
      }),
    ).resolves.toEqual({
      identityExists: false,
      kind: "planned",
      state: "available",
    });
    expect(dependencies.inspectInitialAdmin).toHaveBeenCalledWith(null);
    expect(dependencies.inviteIdentity).not.toHaveBeenCalled();
    expect(dependencies.bootstrapInitialAdmin).not.toHaveBeenCalled();
  });

  it("invites and provisions the first admin with an explicit approval reference", async () => {
    const dependencies = createDependencies();
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.bootstrapInitial({
        approvalReference: "CLIENTE-ADMIN-2026-01",
        email: " ADMIN.NOVO@example.com ",
        mode: "EXECUTE",
        requestId: "initial-admin-bootstrap",
      }),
    ).resolves.toEqual({
      accountId: "b0000000-0000-4000-8000-000000000009",
      kind: "provisioned",
    });
    expect(dependencies.inviteIdentity).toHaveBeenCalledWith(
      "admin.novo@example.com",
    );
    expect(dependencies.bootstrapInitialAdmin).toHaveBeenCalledWith({
      approvalReference: "CLIENTE-ADMIN-2026-01",
      email: "admin.novo@example.com",
      identityId: invitedIdentity.id,
      requestId: "initial-admin-bootstrap",
    });
  });

  it("is idempotent for an already provisioned initial admin", async () => {
    const dependencies = createDependencies({
      bootstrapInitialAdmin: vi.fn(async () => ({
        accountId: "b0000000-0000-4000-8000-000000000001",
        kind: "already_provisioned" as const,
      })),
      findIdentityByEmail: vi.fn(async () => invitedIdentity),
    });
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.bootstrapInitial({
        approvalReference: "CLIENTE-ADMIN-2026-01",
        email: invitedIdentity.email,
        mode: "EXECUTE",
        requestId: "initial-admin-bootstrap-repeat",
      }),
    ).resolves.toEqual({
      accountId: "b0000000-0000-4000-8000-000000000001",
      kind: "already_provisioned",
    });
    expect(dependencies.inviteIdentity).not.toHaveBeenCalled();
  });

  it.each([
    {
      approvalReference: "",
      email: "admin@example.com",
      code: "APPROVAL_REFERENCE_REQUIRED",
    },
    {
      approvalReference: "CLIENTE-ADMIN-2026-01",
      email: "invalid",
      code: "EMAIL_INVALID",
    },
  ])("rejects invalid bootstrap input before side effects", async (input) => {
    const dependencies = createDependencies();
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.bootstrapInitial({
        ...input,
        mode: "EXECUTE",
        requestId: "invalid-bootstrap",
      }),
    ).resolves.toEqual({
      code: input.code,
      kind: "rejected",
    });
    expect(dependencies.findIdentityByEmail).not.toHaveBeenCalled();
    expect(dependencies.inviteIdentity).not.toHaveBeenCalled();
  });

  it("authorizes the current admin before looking up or inviting another identity", async () => {
    const dependencies = createDependencies({
      resolveCurrentSession: vi.fn(async () => companySession),
    });
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.provisionAdditional({
        email: invitedIdentity.email,
        reason: "Novo operador aprovado pelo cliente",
        requestId: "additional-admin-denied",
      }),
    ).resolves.toEqual({
      code: "ADMIN_REQUIRED",
      kind: "rejected",
    });
    expect(dependencies.findIdentityByEmail).not.toHaveBeenCalled();
    expect(dependencies.inviteIdentity).not.toHaveBeenCalled();
    expect(dependencies.provisionAdditionalAdmin).not.toHaveBeenCalled();
  });

  it("provisions a subsequent admin through the authorized audited repository", async () => {
    const dependencies = createDependencies();
    const service = createAdminProvisioningService(dependencies);

    await expect(
      service.provisionAdditional({
        email: invitedIdentity.email,
        reason: " Novo operador aprovado pelo cliente ",
        requestId: "additional-admin-provision",
      }),
    ).resolves.toEqual({
      accountId: "b0000000-0000-4000-8000-000000000009",
      kind: "provisioned",
    });
    expect(dependencies.provisionAdditionalAdmin).toHaveBeenCalledWith({
      email: invitedIdentity.email,
      identityId: invitedIdentity.id,
      reason: "Novo operador aprovado pelo cliente",
      requestId: "additional-admin-provision",
    });
  });
});
