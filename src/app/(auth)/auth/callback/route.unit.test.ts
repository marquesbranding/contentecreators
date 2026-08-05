import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerBannedAccountDefenseService: vi.fn(),
  createServerIdentityAuthService: vi.fn(),
  createServerOnboardingRegistrationService: vi.fn(),
}));

vi.mock("@/features/identity/server", () => ({
  createServerBannedAccountDefenseService:
    mocks.createServerBannedAccountDefenseService,
  createServerIdentityAuthService: mocks.createServerIdentityAuthService,
}));

vi.mock("@/features/onboarding/server", () => ({
  createServerOnboardingRegistrationService:
    mocks.createServerOnboardingRegistrationService,
}));

import { GET } from "./route";

describe("auth callback route", () => {
  it("submits prepared email onboarding after confirmation instead of reopening the form", async () => {
    const exchangeCallback = vi.fn().mockResolvedValue({ kind: "success" });
    const requireVerifiedIdentity = vi.fn().mockResolvedValue({
      identityId: "91000000-0000-4000-8000-000000000010",
      kind: "verified",
    });
    const enforce = vi.fn().mockResolvedValue({ kind: "allowed" });
    const finalizePreparedEmailRegistration = vi.fn().mockResolvedValue({
      destination: "/app/status/analysis",
      kind: "redirect",
    });

    mocks.createServerIdentityAuthService.mockResolvedValue({
      exchangeCallback,
      requireVerifiedIdentity,
    });
    mocks.createServerBannedAccountDefenseService.mockResolvedValue({
      enforce,
    });
    mocks.createServerOnboardingRegistrationService.mockResolvedValue({
      finalizePreparedEmailRegistration,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=confirmed-code&next=%2Fonboarding%2Finfluencer",
      ),
    );

    expect(exchangeCallback).toHaveBeenCalledWith("confirmed-code");
    expect(finalizePreparedEmailRegistration).toHaveBeenCalledWith(
      "91000000-0000-4000-8000-000000000010",
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/app/status/analysis?confirmed=1",
    );
  });
});
