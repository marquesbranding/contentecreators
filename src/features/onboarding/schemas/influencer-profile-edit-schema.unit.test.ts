import { describe, expect, it } from "vitest";

import { influencerProfileEditSchema } from "./influencer-profile-edit-schema";

const completeEdit = {
  bio: "Crio conteúdo autoral de tecnologia e produtividade para a internet.",
  city: "São Paulo",
  creatorType: "UGC",
  displayName: "Joana Atualizada",
  expectedVersion: "3",
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia-games-e-inovacao"],
  socialChannels: [
    {
      followerCount: "42000",
      interactions: "1200",
      isPrimary: true,
      newFollowers: "300",
      platform: "INSTAGRAM",
      sharedContent: "Reels e vlogs semanais",
      url: "https://instagram.com/joana-atualizada",
      views: "80000",
    },
  ],
  state: "sp",
  whatsapp: "(11) 99999-9999",
};

describe("influencer profile edit schema", () => {
  it("reuses onboarding validation and normalizes numeric/version fields", () => {
    const result = influencerProfileEditSchema.safeParse(completeEdit);

    expect(result).toEqual({
      data: expect.objectContaining({
        expectedVersion: 3,
        socialChannels: [
          expect.objectContaining({
            followerCount: 42000,
            interactions: 1200,
            newFollowers: 300,
            views: 80000,
          }),
        ],
        state: "SP",
      }),
      success: true,
    });
  });

  it("rejects invalid metrics, URLs and stale-shaped versions", () => {
    const result = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      expectedVersion: "0",
      socialChannels: [
        {
          followerCount: "-1",
          isPrimary: true,
          platform: "YOUTUBE",
          url: "not-a-url",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("canonicalizes HTTP social URLs and rejects unsupported protocols", () => {
    const normalized = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialChannels: [
        {
          followerCount: "10000",
          isPrimary: true,
          platform: "INSTAGRAM",
          url: " HTTPS://Instagram.COM:443/joana-atualizada/#sobre ",
        },
      ],
    });
    const unsupported = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialChannels: [
        {
          followerCount: "10000",
          isPrimary: true,
          platform: "INSTAGRAM",
          url: "ftp://instagram.com/joana-atualizada",
        },
      ],
    });

    expect(normalized).toMatchObject({
      data: {
        socialChannels: [
          {
            platform: "INSTAGRAM",
            url: "https://instagram.com/joana-atualizada",
          },
        ],
      },
      success: true,
    });
    expect(unsupported.success).toBe(false);
  });

  it.each([
    { followerCount: "-1" },
    { followerCount: "1.5" },
    { interactions: "-1" },
    { newFollowers: "1.5" },
    { views: "-1" },
  ])("rejects invalid self-reported metrics %#", (metricOverride) => {
    expect(
      influencerProfileEditSchema.safeParse({
        ...completeEdit,
        socialChannels: [
          { ...completeEdit.socialChannels[0], ...metricOverride },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects Instagram-only metrics declared on another network", () => {
    const result = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialChannels: [
        {
          followerCount: "10000",
          interactions: "500",
          isPrimary: true,
          platform: "YOUTUBE",
          url: "https://youtube.com/@joana-atualizada",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a payload with more than one primary channel", () => {
    const result = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialChannels: [
        completeEdit.socialChannels[0],
        {
          followerCount: "5000",
          isPrimary: true,
          platform: "YOUTUBE",
          url: "https://youtube.com/@joana-atualizada",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
