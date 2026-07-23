import { describe, expect, it } from "vitest";

import { roleSelectionSchema } from "./role-selection-schema";

describe("role selection schema", () => {
  it.each([
    ["influencer", "INFLUENCER"],
    ["COMPANY", "COMPANY"],
  ])("accepts the public role %s", (input, expected) => {
    expect(roleSelectionSchema.parse({ role: input })).toEqual({
      role: expected,
    });
  });

  it.each(["ADMIN", "", "AGENCY", undefined])(
    "rejects the non-public role %s",
    (role) => {
      expect(roleSelectionSchema.safeParse({ role }).success).toBe(false);
    },
  );
});
