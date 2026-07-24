import { describe, expect, it, vi } from "vitest";

import type { CurrentSessionDto } from "../../types/current-account.types";
import {
  BACKOFFICE_AUTH_MESSAGES,
  createBackofficeAuthService,
} from "./backoffice-auth.service";

const adminSession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000001",
    role: "ADMIN",
    status: "APPROVED",
  },
  kind: "authenticated",
};

const companySession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000002",
    role: "COMPANY",
    status: "APPROVED",
  },
  kind: "authenticated",
};

const suspendedAdminSession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000003",
    role: "ADMIN",
    status: "SUSPENDED",
  },
  kind: "authenticated",
};

function createDependencies(session: CurrentSessionDto = adminSession) {
  return {
    beginGoogleSignIn: vi.fn(async () => ({
      kind: "redirect" as const,
      url: "https://accounts.google.test/oauth",
    })),
    resolveCurrentSession: vi.fn(async () => session),
    signIn: vi.fn(
      async (): Promise<
        | {
            destination: string;
            kind: "redirect";
          }
        | {
            kind: "failure";
            message: string;
          }
      > => ({
        destination: "/backoffice",
        kind: "redirect",
      }),
    ),
    signOut: vi.fn(async () => ({ kind: "success" as const })),
  };
}

describe("backoffice auth service", () => {
  it("admits only an approved ADMIN after password authentication", async () => {
    const dependencies = createDependencies();
    const service = createBackofficeAuthService(dependencies);

    await expect(
      service.signIn(
        {
          email: "admin@example.com",
          nextPath: "/backoffice/accounts",
          password: "SenhaSegura123",
        },
        "backoffice-password-login",
      ),
    ).resolves.toEqual({
      destination: "/backoffice/accounts",
      kind: "redirect",
    });
    expect(dependencies.resolveCurrentSession).toHaveBeenCalledWith(
      "backoffice-password-login",
    );
    expect(dependencies.signOut).not.toHaveBeenCalled();
  });

  it.each([
    companySession,
    suspendedAdminSession,
    {
      account: null,
      kind: "anonymous" as const,
    },
  ])("denies and signs out a non-admin session", async (session) => {
    const dependencies = createDependencies(session);
    const service = createBackofficeAuthService(dependencies);

    await expect(
      service.signIn(
        {
          email: "pessoa@example.com",
          nextPath: "/backoffice",
          password: "SenhaSegura123",
        },
        "backoffice-password-login",
      ),
    ).resolves.toEqual({
      kind: "failure",
      message: BACKOFFICE_AUTH_MESSAGES.unauthorized,
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
  });

  it("does not perform account lookup when credentials fail", async () => {
    const dependencies = createDependencies();
    dependencies.signIn.mockResolvedValueOnce({
      kind: "failure",
      message: "Falha genérica de autenticação.",
    });
    const service = createBackofficeAuthService(dependencies);

    await expect(
      service.signIn(
        {
          email: "unknown@example.com",
          nextPath: "/backoffice",
          password: "invalid",
        },
        "backoffice-password-login",
      ),
    ).resolves.toEqual({
      kind: "failure",
      message: "Falha genérica de autenticação.",
    });
    expect(dependencies.resolveCurrentSession).not.toHaveBeenCalled();
    expect(dependencies.signOut).not.toHaveBeenCalled();
  });

  it("uses the same role gate after the Google callback", async () => {
    const deniedDependencies = createDependencies(companySession);
    const deniedService = createBackofficeAuthService(deniedDependencies);
    const adminService = createBackofficeAuthService(createDependencies());

    await expect(
      deniedService.completeGoogleSignIn(
        "/backoffice/accounts",
        "backoffice-google-login",
      ),
    ).resolves.toEqual({
      kind: "failure",
      message: BACKOFFICE_AUTH_MESSAGES.unauthorized,
    });
    expect(deniedDependencies.signOut).toHaveBeenCalledOnce();
    await expect(
      adminService.completeGoogleSignIn(
        "/backoffice/accounts",
        "backoffice-google-login",
      ),
    ).resolves.toEqual({
      destination: "/backoffice/accounts",
      kind: "redirect",
    });
  });

  it("wraps Google OAuth in the dedicated post-callback role check", async () => {
    const dependencies = createDependencies();
    const service = createBackofficeAuthService(dependencies);

    await expect(
      service.beginGoogleSignIn("/backoffice/accounts?page=2"),
    ).resolves.toEqual({
      kind: "redirect",
      url: "https://accounts.google.test/oauth",
    });
    expect(dependencies.beginGoogleSignIn).toHaveBeenCalledWith(
      "/backoffice/auth-check?next=%2Fbackoffice%2Faccounts%3Fpage%3D2",
    );
  });

  it("exposes a side-effect-free guard for protected layouts", async () => {
    const dependencies = createDependencies(companySession);
    const service = createBackofficeAuthService(dependencies);

    await expect(service.authorize("backoffice-layout")).resolves.toEqual({
      kind: "denied",
    });
    expect(dependencies.signOut).not.toHaveBeenCalled();
  });
});
