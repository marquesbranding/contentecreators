import { describe, expect, it } from "vitest";

import {
  buildRegistrationHref,
  isMarketingRegistrationIntent,
} from "@/features/marketing/domain/registration-intent";

describe("marketing registration intent", () => {
  it.each([
    ["INFLUENCER", "/sign-up?intent=influencer"],
    ["COMPANY", "/sign-up?intent=company"],
  ] as const)("preserves %s as untrusted Auth intent", (intent, expected) => {
    expect(buildRegistrationHref(intent)).toBe(expected);
  });

  it("accepts only public self-service intents", () => {
    expect(isMarketingRegistrationIntent("influencer")).toBe(true);
    expect(isMarketingRegistrationIntent("company")).toBe(true);
    expect(isMarketingRegistrationIntent("admin")).toBe(false);
    expect(isMarketingRegistrationIntent(undefined)).toBe(false);
  });
});
