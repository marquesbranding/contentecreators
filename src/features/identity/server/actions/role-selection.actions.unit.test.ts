import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerRoleSelectionService } from "../services/server-role-selection.service";
import { selectRoleAction } from "./role-selection.actions";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../services/server-role-selection.service", () => ({
  createServerRoleSelectionService: vi.fn(),
}));

const mockedCreateServerRoleSelectionService = vi.mocked(
  createServerRoleSelectionService,
);

describe("role selection action", () => {
  beforeEach(() => {
    mockedCreateServerRoleSelectionService.mockResolvedValue({
      getEntryDecision: vi.fn(),
      selectRole: vi.fn(),
    });
  });

  it("rejects a public ADMIN submission before any persistence access", async () => {
    const formData = new FormData();
    formData.set("role", "ADMIN");

    await expect(
      selectRoleAction({ status: "idle" }, formData),
    ).resolves.toEqual({
      message: "Selecione uma opção para continuar.",
      roleError: "Escolha como você vai usar a plataforma.",
      status: "error",
    });
    expect(mockedCreateServerRoleSelectionService).not.toHaveBeenCalled();
  });

  it("returns the immutable-role domain error from a direct tampered action", async () => {
    mockedCreateServerRoleSelectionService.mockResolvedValue({
      getEntryDecision: vi.fn(),
      selectRole: vi.fn(async () => ({
        destination: "/onboarding/influencer",
        kind: "immutable_role" as const,
        message:
          "O tipo de perfil já foi confirmado e não pode ser alterado por este acesso.",
      })),
    });
    const formData = new FormData();
    formData.set("role", "COMPANY");

    await expect(
      selectRoleAction({ status: "idle" }, formData),
    ).resolves.toEqual({
      message:
        "O tipo de perfil já foi confirmado e não pode ser alterado por este acesso.",
      status: "error",
    });
  });
});
