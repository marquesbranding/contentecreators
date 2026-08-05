import { describe, expect, it, vi } from "vitest";

import { createSupabaseRegistrationIdentityGateway } from "./supabase-registration-identity.gateway";

describe("supabase registration identity gateway", () => {
  function createGateway(signUpResult: unknown) {
    const authClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue(signUpResult),
      },
    };
    const adminClient = {
      auth: {
        admin: {
          deleteUser: vi.fn(),
        },
      },
    };

    return createSupabaseRegistrationIdentityGateway(
      authClient as never,
      adminClient as never,
    );
  }

  it("detects existing email when Supabase returns an empty identities list", async () => {
    const gateway = createGateway({
      data: {
        session: null,
        user: { id: "identity-1", identities: [] },
      },
      error: null,
    });

    await expect(
      gateway.signUp({
        callbackUrl: "https://app.example/auth/callback",
        email: "joana@example.com",
        password: "StrongPass1",
      }),
    ).resolves.toEqual({ kind: "account_exists" });
  });

  it("detects existing email from auth errors", async () => {
    const gateway = createGateway({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    });

    await expect(
      gateway.signUp({
        callbackUrl: "https://app.example/auth/callback",
        email: "joana@example.com",
        password: "StrongPass1",
      }),
    ).resolves.toEqual({ kind: "account_exists" });
  });
});
