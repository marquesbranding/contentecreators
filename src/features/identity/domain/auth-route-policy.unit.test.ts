import { describe, expect, it } from "vitest";

import { getOptimisticAuthRouteDecision } from "./auth-route-policy";

describe("optimistic auth route policy", () => {
  it.each([
    ["/app", "/login?next=%2Fapp"],
    [
      "/onboarding/profile?step=media",
      "/login?next=%2Fonboarding%2Fprofile%3Fstep%3Dmedia",
    ],
    ["/backoffice", "/backoffice/login?next=%2Fbackoffice"],
  ])("redirects an anonymous protected request %s", (path, destination) => {
    expect(
      getOptimisticAuthRouteDecision({
        authenticated: false,
        requestPath: path,
      }),
    ).toEqual({ destination, kind: "redirect" });
  });

  it.each([
    "/",
    "/login",
    "/sign-up?intent=company",
    "/forgot-password",
    "/reset-password",
    "/auth/callback?code=abc",
    "/privacy",
  ])("allows the public path %s", (requestPath) => {
    expect(
      getOptimisticAuthRouteDecision({
        authenticated: false,
        requestPath,
      }),
    ).toEqual({ kind: "continue" });
  });

  it("does not treat Proxy as role authorization for an authenticated user", () => {
    expect(
      getOptimisticAuthRouteDecision({
        authenticated: true,
        requestPath: "/backoffice",
      }),
    ).toEqual({ kind: "continue" });
  });
});
