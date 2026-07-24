import { describe, expect, it } from "vitest";

import { influencerProfileEditSchema } from "./influencer-profile-edit-schema";

const completeEdit = {
  bio: "Crio conteúdo autoral de tecnologia e produtividade para a internet.",
  city: "São Paulo",
  creatorType: "UGC",
  displayName: "Joana Atualizada",
  engagementRate: "5.75",
  expectedVersion: "3",
  followers: "42000",
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia"],
  socialPlatform: "YOUTUBE",
  socialUrl: "https://youtube.com/@joana-atualizada",
  state: "sp",
  whatsapp: "(11) 99999-9999",
};

describe("influencer profile edit schema", () => {
  it("reuses onboarding validation and normalizes numeric/version fields", () => {
    const result = influencerProfileEditSchema.safeParse(completeEdit);

    expect(result).toEqual({
      data: expect.objectContaining({
        engagementRate: 5.75,
        expectedVersion: 3,
        followers: 42000,
        state: "SP",
      }),
      success: true,
    });
  });

  it("rejects invalid metrics, URLs and stale-shaped versions", () => {
    const result = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      engagementRate: "101",
      expectedVersion: "0",
      socialUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("canonicalizes HTTP social URLs and rejects unsupported protocols", () => {
    const normalized = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialUrl: " HTTPS://Instagram.COM:443/joana-atualizada/#sobre ",
    });
    const unsupported = influencerProfileEditSchema.safeParse({
      ...completeEdit,
      socialUrl: "ftp://instagram.com/joana-atualizada",
    });

    expect(normalized).toMatchObject({
      data: {
        socialUrl: "https://instagram.com/joana-atualizada",
      },
      success: true,
    });
    expect(unsupported.success).toBe(false);
  });

  it.each([
    { engagementRate: "-0.01", followers: "42000" },
    { engagementRate: "100.01", followers: "42000" },
    { engagementRate: "5.75", followers: "-1" },
    { engagementRate: "5.75", followers: "1.5" },
  ])("rejects invalid self-reported metrics %#", (metrics) => {
    expect(
      influencerProfileEditSchema.safeParse({
        ...completeEdit,
        ...metrics,
      }).success,
    ).toBe(false);
  });
});
