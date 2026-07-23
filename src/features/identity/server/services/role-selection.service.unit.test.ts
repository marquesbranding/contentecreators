import { describe, expect, it, vi } from "vitest";

import type {
  IdentityAccountSummary,
  RoleSelectionRepository,
} from "./role-selection.service";
import { createRoleSelectionService } from "./role-selection.service";

const influencerAccount: IdentityAccountSummary = {
  id: "20000000-0000-4000-8000-000000000002",
  role: "INFLUENCER",
  status: "ONBOARDING",
};

function createRepository(
  overrides: Partial<RoleSelectionRepository> = {},
): RoleSelectionRepository {
  return {
    findByIdentityId: vi.fn(async () => null),
    selectInitialRole: vi.fn(async ({ role }) => ({
      account: { ...influencerAccount, role },
      kind: "selected" as const,
    })),
    ...overrides,
  };
}

describe("role selection service", () => {
  it("opens selection only while the account has no role", async () => {
    const newIdentityService = createRoleSelectionService(createRepository());
    const existingIdentityService = createRoleSelectionService(
      createRepository({
        findByIdentityId: vi.fn(async () => influencerAccount),
      }),
    );

    await expect(
      newIdentityService.getEntryDecision("identity-id"),
    ).resolves.toEqual({ kind: "ready" });
    await expect(
      existingIdentityService.getEntryDecision("identity-id"),
    ).resolves.toEqual({
      destination: "/onboarding/influencer",
      kind: "redirect",
    });
  });

  it("selects one role and returns its onboarding destination", async () => {
    const repository = createRepository();
    const service = createRoleSelectionService(repository);

    await expect(
      service.selectRole({
        email: "pessoa@example.com",
        identityId: "identity-id",
        requestId: "request-id",
        role: "COMPANY",
      }),
    ).resolves.toEqual({
      destination: "/onboarding/company",
      kind: "redirect",
    });
    expect(repository.selectInitialRole).toHaveBeenCalledWith({
      email: "pessoa@example.com",
      identityId: "identity-id",
      requestId: "request-id",
      role: "COMPANY",
    });
  });

  it("keeps an already selected role idempotently", async () => {
    const service = createRoleSelectionService(
      createRepository({
        selectInitialRole: vi.fn(async () => ({
          account: influencerAccount,
          kind: "already_selected" as const,
        })),
      }),
    );

    await expect(
      service.selectRole({
        email: "pessoa@example.com",
        identityId: "identity-id",
        requestId: "request-id",
        role: "INFLUENCER",
      }),
    ).resolves.toEqual({
      destination: "/onboarding/influencer",
      kind: "redirect",
    });
  });

  it("rejects attempts to change a role after confirmation", async () => {
    const service = createRoleSelectionService(
      createRepository({
        selectInitialRole: vi.fn(async () => ({
          account: influencerAccount,
          kind: "conflict" as const,
        })),
      }),
    );

    await expect(
      service.selectRole({
        email: "pessoa@example.com",
        identityId: "identity-id",
        requestId: "request-id",
        role: "COMPANY",
      }),
    ).resolves.toEqual({
      destination: "/onboarding/influencer",
      kind: "immutable_role",
      message:
        "O tipo de perfil já foi confirmado e não pode ser alterado por este acesso.",
    });
  });
});
