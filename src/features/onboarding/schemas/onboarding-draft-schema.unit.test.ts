import { describe, expect, it } from "vitest";

import { creatorOnboardingDraftPayloadSchema } from "./onboarding-draft-schema";

const channel = {
  followerCount: 100,
  isPrimary: true,
  platform: "INSTAGRAM",
  url: "https://instagram.com/joana",
};

describe("onboarding draft schema", () => {
  it("keeps a numeric shared content count", () => {
    const result = creatorOnboardingDraftPayloadSchema.safeParse({
      displayName: "Joana",
      socialChannels: [{ ...channel, sharedContent: 22 }],
    });

    expect(result).toMatchObject({
      data: { socialChannels: [{ sharedContent: 22 }] },
      success: true,
    });
  });

  it("drops legacy free-text shared content without invalidating the draft", () => {
    const result = creatorOnboardingDraftPayloadSchema.safeParse({
      displayName: "Joana",
      socialChannels: [{ ...channel, sharedContent: "Reels, vlogs" }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.displayName).toBe("Joana");
    expect(result.data?.socialChannels?.[0]?.sharedContent).toBeUndefined();
  });

  it("converts a legacy numeric string to a number", () => {
    const result = creatorOnboardingDraftPayloadSchema.safeParse({
      socialChannels: [{ ...channel, sharedContent: "22" }],
    });

    expect(result.data?.socialChannels?.[0]?.sharedContent).toBe(22);
  });
});
