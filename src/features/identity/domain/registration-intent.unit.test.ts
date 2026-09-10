import { describe, expect, it } from "vitest";

import {
  buildRoleSelectionPath,
  parseRegistrationIntent,
  parseSignUpAccountIntent,
} from "./registration-intent";

describe("sign-up account intent", () => {
  it.each([
    ["influencer", "INFLUENCER"],
    ["ugc", "UGC"],
    ["company", "COMPANY"],
    ["  UGC  ", "UGC"],
  ] as const)(
    "maps the %s landing button to its account card",
    (value, expected) => {
      expect(parseSignUpAccountIntent(value)).toBe(expected);
    },
  );

  it.each([["admin"], [""], [undefined], [42]])(
    "rejects %s as a self-service intent",
    (value) => {
      expect(parseSignUpAccountIntent(value)).toBeUndefined();
    },
  );
});

describe("registration intent", () => {
  it("keeps UGC on the influencer account role", () => {
    /* `account_role` has no UGC — the subtype lives in `creator_type`, which
     * the post-Google onboarding step asks for separately. */
    expect(parseRegistrationIntent("ugc")).toBe("INFLUENCER");
    expect(parseRegistrationIntent("influencer")).toBe("INFLUENCER");
    expect(parseRegistrationIntent("company")).toBe("COMPANY");
    expect(parseRegistrationIntent("admin")).toBeUndefined();
  });

  it("carries the intent into the role selection path", () => {
    expect(buildRoleSelectionPath()).toBe("/onboarding/role");
    expect(buildRoleSelectionPath(parseRegistrationIntent("ugc"))).toBe(
      "/onboarding/role?intent=influencer",
    );
  });
});
