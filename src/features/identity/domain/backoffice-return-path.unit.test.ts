import { describe, expect, it } from "vitest";

import {
  buildBackofficeAuthCheckPath,
  sanitizeBackofficeReturnPath,
} from "./backoffice-return-path";

describe("backoffice return paths", () => {
  it.each([
    ["/backoffice", "/backoffice"],
    ["/backoffice/accounts?page=2", "/backoffice/accounts?page=2"],
  ])("preserves an internal backoffice destination", (input, expected) => {
    expect(sanitizeBackofficeReturnPath(input)).toBe(expected);
  });

  it.each([
    "/app/catalog",
    "/onboarding/role",
    "/backoffice/login",
    "/backoffice/auth-check",
    "//attacker.example/backoffice",
    "https://attacker.example/backoffice",
  ])("rejects a non-operational destination %s", (input) => {
    expect(sanitizeBackofficeReturnPath(input)).toBe("/backoffice");
  });

  it("builds a one-time post-OAuth role-check destination", () => {
    expect(buildBackofficeAuthCheckPath("/backoffice/accounts?page=2")).toBe(
      "/backoffice/auth-check?next=%2Fbackoffice%2Faccounts%3Fpage%3D2",
    );
  });
});
