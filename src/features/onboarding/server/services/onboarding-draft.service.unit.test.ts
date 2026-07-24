import { describe, expect, it, vi } from "vitest";

import type { ApplicationTransaction } from "@/db/client";

import {
  createOnboardingDraftService,
  OnboardingDraftError,
  type OnboardingDraftRepository,
  type OwnerDraftTransactionRunner,
} from "./onboarding-draft.service";

const creatorPayload = {
  bio: "Conteúdo sobre tecnologia e rotina de trabalho.",
  creatorType: "UGC" as const,
  displayName: "Joana Creator",
  nicheSlugs: ["tecnologia"],
};

function createRunner(
  owner: {
    accountId: string;
    role: "ADMIN" | "COMPANY" | "INFLUENCER";
    status:
      | "APPROVED"
      | "BANNED"
      | "CHANGES_REQUESTED"
      | "ONBOARDING"
      | "PENDING_REVIEW"
      | "SUSPENDED";
  } = {
    accountId: "a0000000-0000-4000-8000-000000000001",
    role: "INFLUENCER",
    status: "ONBOARDING",
  },
): OwnerDraftTransactionRunner {
  return async (_request, work) => work({} as ApplicationTransaction, owner);
}

function createRepository(
  overrides: Partial<OnboardingDraftRepository> = {},
): OnboardingDraftRepository {
  return {
    loadOwnerDraft: vi.fn().mockResolvedValue(null),
    saveOwnerDraft: vi.fn().mockResolvedValue({
      draft: {
        payload: creatorPayload,
        role: "INFLUENCER",
        updatedAt: new Date("2026-07-24T14:00:00.000Z"),
        version: 1,
      },
      kind: "saved",
    }),
    ...overrides,
  };
}

describe("onboarding draft service", () => {
  it("loads only the current authenticated owner's draft", async () => {
    const draft = {
      payload: creatorPayload,
      role: "INFLUENCER" as const,
      updatedAt: new Date("2026-07-24T14:00:00.000Z"),
      version: 3,
    };
    const repository = createRepository({
      loadOwnerDraft: vi.fn().mockResolvedValue(draft),
    });
    const service = createOnboardingDraftService({
      repository,
      runOwnerTransaction: createRunner(),
    });

    await expect(
      service.loadOwnerDraft({ requestId: "request-load" }),
    ).resolves.toEqual(draft);
    expect(repository.loadOwnerDraft).toHaveBeenCalledWith(
      expect.anything(),
      "a0000000-0000-4000-8000-000000000001",
    );
  });

  it("validates and saves a role-appropriate partial draft", async () => {
    const repository = createRepository();
    const service = createOnboardingDraftService({
      repository,
      runOwnerTransaction: createRunner(),
    });

    const result = await service.saveOwnerDraft({
      expectedVersion: 0,
      payload: creatorPayload,
      requestId: "request-save",
      role: "INFLUENCER",
    });

    expect(result.kind).toBe("saved");
    expect(repository.saveOwnerDraft).toHaveBeenCalledWith(expect.anything(), {
      accountId: "a0000000-0000-4000-8000-000000000001",
      expectedVersion: 0,
      payload: creatorPayload,
      role: "INFLUENCER",
    });
  });

  it("rejects unknown or unsafe fields instead of persisting them", async () => {
    const repository = createRepository();
    const service = createOnboardingDraftService({
      repository,
      runOwnerTransaction: createRunner(),
    });

    const unsafeInput = {
      expectedVersion: 0,
      payload: {
        displayName: "Joana",
        password: "NaoDeveSerPersistida123",
      },
      requestId: "request-invalid",
      role: "INFLUENCER",
    } as unknown as Parameters<typeof service.saveOwnerDraft>[0];

    await expect(service.saveOwnerDraft(unsafeInput)).rejects.toEqual(
      new OnboardingDraftError("INVALID_INPUT"),
    );
    expect(repository.saveOwnerDraft).not.toHaveBeenCalled();
  });

  it("rejects a role that differs from the immutable account role", async () => {
    const repository = createRepository();
    const service = createOnboardingDraftService({
      repository,
      runOwnerTransaction: createRunner(),
    });

    await expect(
      service.saveOwnerDraft({
        expectedVersion: 0,
        payload: { tradeName: "Empresa Exemplo" },
        requestId: "request-role",
        role: "COMPANY",
      }),
    ).rejects.toEqual(new OnboardingDraftError("ROLE_MISMATCH"));
    expect(repository.saveOwnerDraft).not.toHaveBeenCalled();
  });

  it.each(["APPROVED", "PENDING_REVIEW", "SUSPENDED", "BANNED"] as const)(
    "does not load or save onboarding drafts while status is %s",
    async (status) => {
      const repository = createRepository();
      const service = createOnboardingDraftService({
        repository,
        runOwnerTransaction: createRunner({
          accountId: "a0000000-0000-4000-8000-000000000001",
          role: "INFLUENCER",
          status,
        }),
      });

      await expect(
        service.loadOwnerDraft({ requestId: `request-${status}` }),
      ).rejects.toEqual(new OnboardingDraftError("STATUS_FORBIDDEN"));
      await expect(
        service.saveOwnerDraft({
          expectedVersion: 0,
          payload: creatorPayload,
          requestId: `request-save-${status}`,
          role: "INFLUENCER",
        }),
      ).rejects.toEqual(new OnboardingDraftError("STATUS_FORBIDDEN"));
    },
  );

  it("surfaces the persisted version when a stale tab loses the update", async () => {
    const repository = createRepository({
      saveOwnerDraft: vi.fn().mockResolvedValue({
        currentVersion: 4,
        kind: "conflict",
      }),
    });
    const service = createOnboardingDraftService({
      repository,
      runOwnerTransaction: createRunner(),
    });

    await expect(
      service.saveOwnerDraft({
        expectedVersion: 3,
        payload: creatorPayload,
        requestId: "request-conflict",
        role: "INFLUENCER",
      }),
    ).resolves.toEqual({
      currentVersion: 4,
      kind: "conflict",
      message:
        "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.",
    });
  });
});
