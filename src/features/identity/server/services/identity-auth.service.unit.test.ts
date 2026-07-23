import { describe, expect, it, vi } from "vitest";

import {
  AUTH_MESSAGES,
  createIdentityAuthService,
  type IdentityAuthGateway,
} from "./identity-auth.service";

function createGateway(
  overrides: Partial<IdentityAuthGateway> = {},
): IdentityAuthGateway {
  return {
    beginGoogleSignIn: vi.fn(async () => ({
      kind: "success" as const,
      url: "https://accounts.google.test/oauth",
    })),
    exchangeCodeForSession: vi.fn(async () => ({
      kind: "success" as const,
    })),
    getCurrentIdentity: vi.fn(async () => ({
      email: "pessoa@example.com",
      emailConfirmedAt: "2026-07-23T12:00:00.000Z",
      emailVerifiedByProvider: false,
      id: "10000000-0000-4000-8000-000000000001",
    })),
    requestPasswordRecovery: vi.fn(async () => ({
      kind: "success" as const,
    })),
    resendConfirmation: vi.fn(async () => ({ kind: "success" as const })),
    signInWithPassword: vi.fn(async () => ({ kind: "success" as const })),
    signOut: vi.fn(async () => ({ kind: "success" as const })),
    signUpWithPassword: vi.fn(async () => ({
      confirmationRequired: true,
      kind: "success" as const,
    })),
    updatePassword: vi.fn(async () => ({ kind: "success" as const })),
    ...overrides,
  };
}

describe("identity auth service", () => {
  it.each(["invalid_credentials", "identity_not_found", "email_unconfirmed"])(
    "returns the same non-enumerating login response for %s",
    async (code) => {
      const service = createIdentityAuthService(
        createGateway({
          signInWithPassword: vi.fn(async () => ({
            code,
            kind: "failure" as const,
          })),
        }),
        { appUrl: "http://localhost:3000" },
      );

      await expect(
        service.signIn({
          email: "pessoa@example.com",
          nextPath: "/app",
          password: "SenhaSegura123",
        }),
      ).resolves.toEqual({
        kind: "failure",
        message: AUTH_MESSAGES.invalidCredentials,
      });
    },
  );

  it("starts sign-up with a confirmation callback and preserved role intent", async () => {
    const gateway = createGateway();
    const service = createIdentityAuthService(gateway, {
      appUrl: "http://localhost:3000",
    });

    await expect(
      service.signUp({
        email: "pessoa@example.com",
        intent: "COMPANY",
        password: "SenhaSegura123",
        passwordConfirmation: "SenhaSegura123",
      }),
    ).resolves.toEqual({
      kind: "confirmation_required",
      message: AUTH_MESSAGES.confirmationRequired,
    });
    expect(gateway.signUpWithPassword).toHaveBeenCalledWith({
      email: "pessoa@example.com",
      emailRedirectTo:
        "http://localhost:3000/auth/callback?next=%2Fonboarding%2Frole%3Fintent%3Dcompany",
      password: "SenhaSegura123",
    });
  });

  it("never reveals whether a recovery email exists or delivery failed", async () => {
    const service = createIdentityAuthService(
      createGateway({
        requestPasswordRecovery: vi.fn(async () => ({
          code: "provider_unavailable",
          kind: "failure" as const,
        })),
      }),
      { appUrl: "http://localhost:3000" },
    );

    await expect(
      service.requestPasswordRecovery("unknown@example.com"),
    ).resolves.toEqual({
      kind: "success",
      message: AUTH_MESSAGES.recoveryRequested,
    });
  });

  it("validates callbacks and always routes Google through role selection", async () => {
    const gateway = createGateway();
    const service = createIdentityAuthService(gateway, {
      appUrl: "http://localhost:3000",
    });

    await expect(service.exchangeCallback("")).resolves.toEqual({
      kind: "failure",
      message: AUTH_MESSAGES.invalidCallback,
    });
    await expect(
      service.beginGoogleSignIn("https://attacker.example", "COMPANY"),
    ).resolves.toEqual({
      kind: "redirect",
      url: "https://accounts.google.test/oauth",
    });
    expect(gateway.beginGoogleSignIn).toHaveBeenCalledWith({
      redirectTo:
        "http://localhost:3000/auth/callback?next=%2Fonboarding%2Frole",
    });
  });

  it("requires a verified email before protected profile submission", async () => {
    const verifiedService = createIdentityAuthService(createGateway(), {
      appUrl: "http://localhost:3000",
    });
    const unverifiedService = createIdentityAuthService(
      createGateway({
        getCurrentIdentity: vi.fn(async () => ({
          email: "pessoa@example.com",
          emailConfirmedAt: null,
          emailVerifiedByProvider: false,
          id: "10000000-0000-4000-8000-000000000001",
        })),
      }),
      { appUrl: "http://localhost:3000" },
    );

    await expect(verifiedService.requireVerifiedIdentity()).resolves.toEqual({
      email: "pessoa@example.com",
      identityId: "10000000-0000-4000-8000-000000000001",
      kind: "verified",
    });
    await expect(unverifiedService.requireVerifiedIdentity()).resolves.toEqual({
      code: "email_confirmation_required",
      kind: "failure",
      message: AUTH_MESSAGES.emailNotConfirmed,
    });
  });

  it("terminates the provider session without returning protected data", async () => {
    const gateway = createGateway();
    const service = createIdentityAuthService(gateway, {
      appUrl: "http://localhost:3000",
    });

    await expect(service.signOut()).resolves.toEqual({ kind: "success" });
    expect(gateway.signOut).toHaveBeenCalledOnce();
  });

  it("terminates the recovery session after updating the password", async () => {
    const gateway = createGateway();
    const service = createIdentityAuthService(gateway, {
      appUrl: "http://localhost:3000",
    });

    await expect(
      service.updatePassword({
        password: "NovaSenha123",
        passwordConfirmation: "NovaSenha123",
      }),
    ).resolves.toEqual({
      kind: "success",
      message: AUTH_MESSAGES.passwordUpdated,
    });
    expect(gateway.updatePassword).toHaveBeenCalledWith("NovaSenha123");
    expect(gateway.signOut).toHaveBeenCalledOnce();
  });
});
