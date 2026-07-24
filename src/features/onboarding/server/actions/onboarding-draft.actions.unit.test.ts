import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerOnboardingDraftService } from "../services/server-onboarding-draft.service";
import { saveOnboardingDraftAction } from "./onboarding-draft.actions";

vi.mock("../services/server-onboarding-draft.service", () => ({
  createServerOnboardingDraftService: vi.fn(),
}));

const createServiceMock = vi.mocked(createServerOnboardingDraftService);

describe("onboarding draft action", () => {
  beforeEach(() => {
    createServiceMock.mockReset();
  });

  it("rejects malformed payloads before creating a server service", async () => {
    await expect(
      saveOnboardingDraftAction({
        expectedVersion: 0,
        payload: { password: "NaoPersistir123" },
        role: "INFLUENCER",
      }),
    ).resolves.toEqual({
      kind: "invalid",
      message: "Revise os dados do rascunho antes de salvar.",
    });
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("returns a serializable saved draft to the client", async () => {
    const saveOwnerDraft = vi.fn().mockResolvedValue({
      draft: {
        payload: { displayName: "Joana Creator" },
        role: "INFLUENCER",
        updatedAt: new Date("2026-07-24T14:00:00.000Z"),
        version: 2,
      },
      kind: "saved",
    });
    createServiceMock.mockResolvedValue({
      loadOwnerDraft: vi.fn(),
      saveOwnerDraft,
    });

    await expect(
      saveOnboardingDraftAction({
        expectedVersion: 1,
        payload: { displayName: "Joana Creator" },
        role: "INFLUENCER",
      }),
    ).resolves.toEqual({
      draft: {
        payload: { displayName: "Joana Creator" },
        role: "INFLUENCER",
        updatedAt: "2026-07-24T14:00:00.000Z",
        version: 2,
      },
      kind: "saved",
    });
    expect(saveOwnerDraft).toHaveBeenCalledWith({
      expectedVersion: 1,
      payload: { displayName: "Joana Creator" },
      requestId: expect.any(String),
      role: "INFLUENCER",
    });
  });

  it("returns the conflict result without hiding the current version", async () => {
    createServiceMock.mockResolvedValue({
      loadOwnerDraft: vi.fn(),
      saveOwnerDraft: vi.fn().mockResolvedValue({
        currentVersion: 5,
        kind: "conflict",
        message:
          "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.",
      }),
    });

    await expect(
      saveOnboardingDraftAction({
        expectedVersion: 4,
        payload: { tradeName: "Empresa Atualizada" },
        role: "COMPANY",
      }),
    ).resolves.toEqual({
      currentVersion: 5,
      kind: "conflict",
      message:
        "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.",
    });
  });
});
