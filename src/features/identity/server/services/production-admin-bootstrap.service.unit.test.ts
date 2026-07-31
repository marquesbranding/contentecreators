import { describe, expect, it, vi } from "vitest";

import type { AdminIdentity } from "./admin-provisioning.service";
import {
  createProductionAdminBootstrapService,
  type ProductionAdminBootstrapDependencies,
} from "./production-admin-bootstrap.service";

const existingIdentity: AdminIdentity = {
  email: "existing@example.com",
  id: "20000000-0000-4000-8000-000000000001",
};

const createdIdentity: AdminIdentity = {
  email: "new@example.com",
  id: "20000000-0000-4000-8000-000000000002",
};

function createDependencies(
  overrides: Partial<ProductionAdminBootstrapDependencies> = {},
): ProductionAdminBootstrapDependencies {
  return {
    bootstrapApprovedAdmin: vi.fn(async ({ identityId }) => ({
      accountId:
        identityId === existingIdentity.id
          ? "b0000000-0000-4000-8000-000000000001"
          : "b0000000-0000-4000-8000-000000000002",
      kind: "provisioned" as const,
    })),
    findIdentityByEmail: vi.fn(async (email) =>
      email === existingIdentity.email ? existingIdentity : null,
    ),
    preparePasswordIdentity: vi.fn(async ({ existingIdentity: identity }) => ({
      identity: identity ?? createdIdentity,
      passwordSeeded: identity === null,
    })),
    seedExistingPassword: vi.fn(async ({ identity }) => identity),
    ...overrides,
  };
}

describe("production administrator bootstrap service", () => {
  it("provisions the approved set and seeds an existing identity password only once", async () => {
    const dependencies = createDependencies();
    const service = createProductionAdminBootstrapService(dependencies);

    await expect(
      service.bootstrap({
        admins: [
          {
            approvalReference: "CLIENTE-ADMIN-EXISTING-2026-07-31",
            email: existingIdentity.email,
          },
          {
            approvalReference: "CLIENTE-ADMIN-NEW-2026-07-31",
            email: createdIdentity.email,
          },
        ],
        password: "example-only-production-password",
        requestIdPrefix: "production-admins",
      }),
    ).resolves.toEqual({
      count: 2,
      kind: "completed",
      outcomes: ["provisioned", "provisioned"],
    });

    expect(dependencies.bootstrapApprovedAdmin).toHaveBeenNthCalledWith(1, {
      approvalReference: "CLIENTE-ADMIN-EXISTING-2026-07-31",
      email: existingIdentity.email,
      identityId: existingIdentity.id,
      requestId: "production-admins-1",
    });
    expect(dependencies.seedExistingPassword).toHaveBeenCalledTimes(1);
    expect(dependencies.seedExistingPassword).toHaveBeenCalledWith({
      identity: existingIdentity,
      password: "example-only-production-password",
    });
  });

  it("does not reset a password already marked as seeded", async () => {
    const dependencies = createDependencies({
      preparePasswordIdentity: vi.fn(async () => ({
        identity: existingIdentity,
        passwordSeeded: true,
      })),
    });
    const service = createProductionAdminBootstrapService(dependencies);

    await service.bootstrap({
      admins: [
        {
          approvalReference: "CLIENTE-ADMIN-EXISTING-2026-07-31",
          email: existingIdentity.email,
        },
      ],
      password: "example-only-production-password",
      requestIdPrefix: "production-admins",
    });

    expect(dependencies.seedExistingPassword).not.toHaveBeenCalled();
  });

  it.each([
    {
      admins: [
        {
          approvalReference: "CLIENTE-ADMIN-INVALID-2026-07-31",
          email: "invalid",
        },
      ],
      password: "example-only-production-password",
    },
    {
      admins: [
        {
          approvalReference: "CLIENTE-ADMIN-DUPLICATE-2026-07-31",
          email: "duplicate@example.com",
        },
        {
          approvalReference: "CLIENTE-ADMIN-DUPLICATE-2-2026-07-31",
          email: "DUPLICATE@example.com",
        },
      ],
      password: "example-only-production-password",
    },
    {
      admins: [
        {
          approvalReference: "CLIENTE-ADMIN-WEAK-2026-07-31",
          email: "valid@example.com",
        },
      ],
      password: "short",
    },
  ])(
    "rejects unsafe bootstrap configuration before side effects",
    async (input) => {
      const dependencies = createDependencies();
      const service = createProductionAdminBootstrapService(dependencies);

      await expect(
        service.bootstrap({
          ...input,
          requestIdPrefix: "production-admins",
        }),
      ).rejects.toThrow("Invalid production administrator configuration");
      expect(dependencies.findIdentityByEmail).not.toHaveBeenCalled();
    },
  );

  it("stops before password mutation when the account target conflicts", async () => {
    const dependencies = createDependencies({
      bootstrapApprovedAdmin: vi.fn(async () => ({
        code: "ADMIN_CONFLICT" as const,
        kind: "rejected" as const,
      })),
    });
    const service = createProductionAdminBootstrapService(dependencies);

    await expect(
      service.bootstrap({
        admins: [
          {
            approvalReference: "CLIENTE-ADMIN-CONFLICT-2026-07-31",
            email: existingIdentity.email,
          },
        ],
        password: "example-only-production-password",
        requestIdPrefix: "production-admins",
      }),
    ).rejects.toThrow("entry 1");
    expect(dependencies.seedExistingPassword).not.toHaveBeenCalled();
  });
});
