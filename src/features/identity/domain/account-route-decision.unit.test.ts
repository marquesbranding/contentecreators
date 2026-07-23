import { describe, expect, it } from "vitest";

import { getAccountDestination } from "./account-route-decision";

describe("account route decision", () => {
  it.each([
    [null, "ONBOARDING", "/onboarding/role"],
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
