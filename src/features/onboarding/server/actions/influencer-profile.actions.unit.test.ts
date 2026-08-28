import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerInfluencerProfileService } from "../services/server-influencer-profile.service";
import { updateInfluencerProfileAction } from "./influencer-profile.actions";

vi.mock("../services/server-influencer-profile.service", () => ({
  createServerInfluencerProfileService: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedCreateService = vi.mocked(createServerInfluencerProfileService);

function completeProfileForm() {
  const formData = new FormData();
  const fields = {
    bio: "Crio vídeos autorais de viagem e tecnologia para marcas.",
    city: "Florianópolis",
    creatorType: "UGC",
    displayName: "Diego em Movimento",
    expectedVersion: "3",
    legalName: "Diego Exemplo",
    "socialChannels.YOUTUBE.followers": "54321",
    "socialChannels.YOUTUBE.selected": "on",
    "socialChannels.YOUTUBE.url": "https://youtube.com/@diego-em-movimento",
    state: "SC",
    whatsapp: "(48) 99999-1111",
  };

  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  formData.append("nicheSlugs", "viagens-e-turismo");
  return formData;
}

describe("approved influencer profile action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns field errors without invoking the service", async () => {
    const formData = completeProfileForm();
    formData.set("legalName", "");

    const result = await updateInfluencerProfileAction(
      { status: "idle" },
      formData,
    );

    expect(result).toMatchObject({
      fieldErrors: { legalName: expect.any(Array) },
      message: "Revise os campos destacados para salvar seu perfil.",
      status: "error",
    });
    expect(mockedCreateService).not.toHaveBeenCalled();
  });

  it("publishes an approved profile and returns only its new version", async () => {
    const formData = completeProfileForm();
    formData.set(
      "socialChannels.YOUTUBE.url",
      " HTTPS://YouTube.COM:443/@diego-em-movimento/#perfil ",
    );
    const updateOwnerProfile = vi.fn().mockResolvedValue({
      kind: "updated",
      profile: {
        avatarAssetId: null,
        bio: "private profile text",
        city: "Florianópolis",
        coverAssetId: null,
        creatorType: "UGC",
        displayName: "Diego em Movimento",
        legalName: "Diego Exemplo",
        nicheSlugs: ["viagens-e-turismo"],
        socialChannels: [
          {
            followerCount: 54_321,
            isPrimary: true,
            platform: "YOUTUBE",
            url: "https://youtube.com/@diego-em-movimento",
          },
        ],
        state: "SC",
        version: 4,
        whatsapp: "+5548999991111",
      },
    });
    mockedCreateService.mockResolvedValue({
      loadOwnerProfile: vi.fn(),
      updateOwnerProfile,
    });

    const result = await updateInfluencerProfileAction(
      { status: "idle" },
      formData,
    );

    expect(updateOwnerProfile).toHaveBeenCalledWith({
      input: expect.objectContaining({
        creatorType: "UGC",
        expectedVersion: 3,
        nicheSlugs: ["viagens-e-turismo"],
        socialChannels: [
          {
            followerCount: 54_321,
            isPrimary: true,
            platform: "YOUTUBE",
            url: "https://youtube.com/@diego-em-movimento",
          },
        ],
      }),
      requestId: expect.any(String),
    });
    expect(result).toEqual({
      message: "Perfil atualizado com sucesso.",
      profileVersion: 4,
      status: "success",
    });
    expect(JSON.stringify(result)).not.toContain("private profile text");
    expect(JSON.stringify(result)).not.toContain("+5548999991111");
  });

  it("reports an optimistic concurrency conflict", async () => {
    mockedCreateService.mockResolvedValue({
      loadOwnerProfile: vi.fn(),
      updateOwnerProfile: vi.fn().mockResolvedValue({
        currentVersion: 5,
        kind: "conflict",
      }),
    });

    await expect(
      updateInfluencerProfileAction({ status: "idle" }, completeProfileForm()),
    ).resolves.toEqual({
      message:
        "Seu perfil foi atualizado em outra aba. Recarregue a página antes de tentar novamente.",
      profileVersion: 5,
      status: "error",
    });
  });

  it("does not expose an unexpected server error", async () => {
    mockedCreateService.mockResolvedValue({
      loadOwnerProfile: vi.fn(),
      updateOwnerProfile: vi
        .fn()
        .mockRejectedValue(new Error("database credential leaked")),
    });

    const result = await updateInfluencerProfileAction(
      { status: "idle" },
      completeProfileForm(),
    );

    expect(result).toEqual({
      message: "Não foi possível atualizar seu perfil. Tente novamente.",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("database credential leaked");
  });
});
