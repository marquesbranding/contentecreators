import { describe, expect, it, vi } from "vitest";

import type { AdminModerationTransition } from "../services/admin-moderation.service";
import { createAdminModerationActionHandler } from "./admin-moderation-action-handler";

const accountId = "b0000000-0000-4000-8000-000000000004";
const transition: AdminModerationTransition & {
  authEffectStatus: "not_required";
} = {
  accountId,
  accountVersion: 5,
  action: "APPROVE",
  authEffectId: null,
  authEffectStatus: "not_required",
  authUserId: "20000000-0000-4000-8000-000000000004",
  eventId: "f4000000-0000-4000-8000-000000000004",
  kind: "applied",
  outboxId: "e0000000-0000-4000-8000-000000000003",
  profileVersion: 2,
  status: "APPROVED",
};

function validFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    accountId,
    confirmation: "confirmed",
    expectedAccountVersion: "4",
    expectedProfileVersion: "2",
    idempotencyKey: "moderation:approve:review-4",
    reason: "",
    ...overrides,
  };

  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));

  return formData;
}

function createSubject() {
  const apply = vi.fn().mockResolvedValue(transition);
  const handler = createAdminModerationActionHandler({
    createService: vi.fn(async () => ({ apply })),
    createRequestId: () => "request-admin-action",
  });

  return { apply, handler };
}

describe("admin moderation action handler", () => {
  it("returns only the minimal result needed by the interface", async () => {
    const { apply, handler } = createSubject();

    await expect(handler("APPROVE", validFormData())).resolves.toEqual({
      message: "Cadastro aprovado com sucesso.",
      result: {
        accountId,
        accountVersion: 5,
        action: "APPROVE",
        kind: "applied",
        profileVersion: 2,
        status: "APPROVED",
      },
      status: "success",
    });
    expect(apply).toHaveBeenCalledWith({
      accountId,
      action: "APPROVE",
      expectedAccountVersion: 4,
      expectedProfileVersion: 2,
      idempotencyKey: "moderation:approve:review-4",
      reason: null,
      requestId: "request-admin-action",
    });
  });

  it("requires explicit confirmation even for a direct action request", async () => {
    const { apply, handler } = createSubject();

    await expect(
      handler("APPROVE", validFormData({ confirmation: "no" })),
    ).resolves.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      fieldErrors: {
        confirmation: ["Confirme a ação para continuar."],
      },
      status: "error",
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([
    "REQUEST_CHANGES",
    "SUSPEND",
    "RESTORE",
    "BAN",
    "UNBAN",
    "ARCHIVE",
  ] as const)("requires a human reason for %s", async (action) => {
    const { apply, handler } = createSubject();

    await expect(
      handler(action, validFormData({ reason: " " })),
    ).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: {
        reason: ["Informe um motivo com pelo menos 3 caracteres."],
      },
      status: "error",
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it.each(["admin_moderation_account_stale", "admin_moderation_profile_stale"])(
    "maps %s to a recognizable stale-review state",
    async (message) => {
      const apply = vi.fn().mockRejectedValue(new Error(message));
      const handler = createAdminModerationActionHandler({
        createService: vi.fn(async () => ({ apply })),
        createRequestId: () => "request-admin-action",
      });

      await expect(handler("APPROVE", validFormData())).resolves.toEqual({
        code: "STALE_REVIEW",
        message:
          "Este cadastro mudou desde que você abriu a revisão. Recarregue os dados antes de decidir.",
        status: "conflict",
      });
    },
  );

  it("denies the next direct write after admin authorization is revoked", async () => {
    const apply = vi
      .fn()
      .mockRejectedValue(new Error("moderation_admin_required"));
    const handler = createAdminModerationActionHandler({
      createService: vi.fn(async () => ({ apply })),
      createRequestId: () => "request-admin-action",
    });

    await expect(handler("APPROVE", validFormData())).resolves.toEqual({
      code: "ADMIN_REQUIRED",
      message:
        "Sua sessão não possui mais autorização administrativa. Entre novamente.",
      status: "unauthorized",
    });
  });

  it("rejects actions unavailable for the current account state", async () => {
    const apply = vi
      .fn()
      .mockRejectedValue(new Error("moderation_transition_not_allowed"));
    const handler = createAdminModerationActionHandler({
      createService: vi.fn(async () => ({ apply })),
      createRequestId: () => "request-admin-action",
    });

    await expect(
      handler(
        "SUSPEND",
        validFormData({
          reason: "Suspensão confirmada após análise.",
        }),
      ),
    ).resolves.toEqual({
      code: "INVALID_TRANSITION",
      message: "Esta ação não está disponível para o estado atual do cadastro.",
      status: "error",
    });
  });

  it("sends independent request identifiers so concurrent admins remain attributable", async () => {
    const requestIds = ["request-admin-one", "request-admin-two"];
    const apply = vi.fn().mockResolvedValue(transition);
    const handler = createAdminModerationActionHandler({
      createService: vi.fn(async () => ({ apply })),
      createRequestId: () => requestIds.shift()!,
    });

    await Promise.all([
      handler("APPROVE", validFormData({ idempotencyKey: "admin-one-key" })),
      handler(
        "REQUEST_CHANGES",
        validFormData({
          idempotencyKey: "admin-two-key",
          reason: "Ajustar documento informado.",
        }),
      ),
    ]);

    expect(apply.mock.calls.map(([command]) => command.requestId)).toEqual([
      "request-admin-one",
      "request-admin-two",
    ]);
  });
});
