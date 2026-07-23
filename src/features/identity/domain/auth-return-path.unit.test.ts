import { describe, expect, it } from "vitest";

import {
  buildAuthCallbackUrl,
  sanitizeAuthReturnPath,
} from "./auth-return-path";

describe("auth return paths", () => {
  it.each([
    [
      "/onboarding/role?intent=influencer",
      "/onboarding/role?intent=influencer",
    ],
    ["/app/catalog", "/app/catalog"],
    ["/backoffice", "/backoffice"],
  ])("preserves safe same-origin destination %s", (input, expected) => {
    expect(sanitizeAuthReturnPath(input)).toBe(expected);
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example",
    "javascript:alert(1)",
    "/auth/callback?next=https://attacker.example",
  ])("rejects unsafe return destination %s", (input) => {
    expect(sanitizeAuthReturnPath(input)).toBe("/onboarding/role");
  });

  it("builds an environment-scoped callback with one sanitized destination", () => {
    expect(
      buildAuthCallbackUrl(
        "http://localhost:3000",
        "/onboarding/role?intent=company",
      ),
    ).toBe(
      "http://localhost:3000/auth/callback?next=%2Fonboarding%2Frole%3Fintent%3Dcompany",
    );
  });
});
