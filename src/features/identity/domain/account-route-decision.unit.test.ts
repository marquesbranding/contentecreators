import { describe, expect, it } from "vitest";

import { getAccountDestination } from "./account-route-decision";

describe("account route decision", () => {
  it("resumes the stored profile stage and gives moderation precedence", () => {
    expect(
      getAccountDestination({
        role: "INFLUENCER",
        status: "ONBOARDING",
        registrationStep: "AUDIENCE",
      }),
    ).toBe("/onboarding/influencer?step=audience");
    expect(
      getAccountDestination({
        role: "COMPANY",
        status: "ONBOARDING",
        registrationStep: "LOCATION_TERMS",
      }),
    ).toBe("/onboarding/company?step=location");
    expect(
      getAccountDestination({
        role: "COMPANY",
        status: "PENDING_REVIEW",
        registrationStep: "LOCATION_TERMS",
      }),
    ).toBe("/app/status/analysis");
  });
  it.each([
    [null, "ONBOARDING", "/onboarding/account"],
    ["INFLUENCER", "ONBOARDING", "/onboarding/influencer"],
    ["COMPANY", "ONBOARDING", "/onboarding/company"],
    ["COMPANY", "PENDING_REVIEW", "/app/status/analysis"],
    ["INFLUENCER", "APPROVED", "/app/catalog"],
    ["INFLUENCER", "SUSPENDED", "/app/status/suspended"],
    ["COMPANY", "BANNED", "/app/status/blocked"],
    [
      "COMPANY",
      "CHANGES_REQUESTED",
      "/onboarding/company?corrections=requested",
    ],
    ["ADMIN", "APPROVED", "/backoffice"],
  ] as const)("routes %s in %s to %s", (role, status, expectedDestination) => {
    expect(getAccountDestination({ role, status })).toBe(expectedDestination);
  });
});
