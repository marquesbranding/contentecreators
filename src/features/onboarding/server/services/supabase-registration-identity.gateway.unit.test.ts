import { describe, expect, it, vi } from "vitest";

import { createSupabaseRegistrationIdentityGateway } from "./supabase-registration-identity.gateway";

describe("supabase registration identity gateway", () => {
  function createGateway(
    signUpResult: unknown,
    createUserResult: unknown = { data: { user: null }, error: null },
  ) {
    const authClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue(signUpResult),
      },
    };
    const adminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue(createUserResult),
          deleteUser: vi.fn(),
        },
      },
    };

    return Object.assign(
      createSupabaseRegistrationIdentityGateway(
        authClient as never,
        adminClient as never,
      ),
      { adminClient },
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

  it.each([
    [{ code: "weak_password", status: 422 }, "weak_password"],
    [{ code: "over_email_send_rate_limit", status: 429 }, "rate_limited"],
    [{ code: "over_request_rate_limit", status: 429 }, "rate_limited"],
    [{ code: "email_address_invalid", status: 400 }, "invalid_email"],
    [{ code: "unexpected_failure", status: 400 }, "provider"],
  ])(
    "maps the Supabase auth error %o to the %s failure reason",
    async (error, reason) => {
      const gateway = createGateway({
        data: { session: null, user: null },
        error: { ...error, message: "Auth failure" },
      });

      await expect(
        gateway.signUp({
          callbackUrl: "https://app.example/auth/callback",
          email: "joana@example.com",
          password: "StrongPass1",
        }),
      ).resolves.toEqual({ code: error.code, kind: "failure", reason });
    },
  );

  it("keeps the registration going when Auth cannot send the confirmation email", async () => {
    const gateway = createGateway(
      {
        data: { session: null, user: null },
        error: { message: "{}", name: "AuthRetryableFetchError", status: 500 },
      },
      { data: { user: { id: "identity-smtp" } }, error: null },
    );

    await expect(
      gateway.signUp({
        callbackUrl: "https://app.example/auth/callback",
        email: "joana@example.com",
        password: "StrongPass1",
      }),
    ).resolves.toEqual({
      confirmationEmailSent: false,
      confirmationRequired: true,
      identityId: "identity-smtp",
      kind: "success",
    });
    expect(gateway.adminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: "joana@example.com",
      email_confirm: false,
      password: "StrongPass1",
    });
  });

  it("reports a provider failure when the fallback identity cannot be created either", async () => {
    const gateway = createGateway(
      {
        data: { session: null, user: null },
        error: {
          code: "unexpected_failure",
          message: "Error sending confirmation email",
          status: 500,
        },
      },
      { data: { user: null }, error: { code: "unexpected_failure" } },
    );

    await expect(
      gateway.signUp({
        callbackUrl: "https://app.example/auth/callback",
        email: "joana@example.com",
        password: "StrongPass1",
      }),
    ).resolves.toEqual({
      code: "unexpected_failure",
      kind: "failure",
      reason: "provider",
    });
  });
});
