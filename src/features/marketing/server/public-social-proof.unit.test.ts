import { describe, expect, it } from "vitest";

import {
  assertPublicSocialProofDisabled,
  publicSocialProofEnabled,
} from "@/features/marketing/server";

describe("public social proof", () => {
  it("is immutable and disabled for the Beta", () => {
    expect(publicSocialProofEnabled).toBe(false);
    expect(assertPublicSocialProofDisabled()).toBe(false);
  });
});
