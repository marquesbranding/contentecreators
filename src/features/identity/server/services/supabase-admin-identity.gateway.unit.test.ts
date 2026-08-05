import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseAdminIdentityGateway } from "./supabase-admin-identity.gateway";

function createClient(options?: { fails?: boolean }) {
  const inviteUserByEmail = vi.fn(async () =>
    options?.fails
      ? {
          data: { user: null },
          error: { message: "provider detail" },
        }
      : {
          data: {
            user: {
              email: "admin.novo@example.com",
              id: "20000000-0000-4000-8000-000000000009",
            },
          },
          error: null,
        },
  );
  const createUser = vi.fn(async () => ({
    data: {
      user: {
        app_metadata: { production_admin_password_seeded: true },
        email: "admin.novo@example.com",
        id: "20000000-0000-4000-8000-000000000009",
      },
    },
    error: null,
  }));
  const getUserById = vi.fn(async () => ({
    data: {
      user: {
        app_metadata: { provider: "email" },
        email: "admin.existente@example.com",
        id: "20000000-0000-4000-8000-000000000008",
      },
    },
    error: null,
  }));
  const updateUserById = vi.fn(async () => ({
    data: {
      user: {
        app_metadata: {
          production_admin_password_seeded: true,
          provider: "email",
        },
        email: "admin.existente@example.com",
        id: "20000000-0000-4000-8000-000000000008",
      },
    },
    error: null,
  }));
  const client = {
    auth: {
      admin: {
        createUser,
        getUserById,
        inviteUserByEmail,
        updateUserById,
      },
    },
  } as unknown as SupabaseClient;

  return {
    client,
    createUser,
    getUserById,
    inviteUserByEmail,
    updateUserById,
  };
}

describe("Supabase admin identity gateway", () => {
  it("invites through the server-only Admin API with an environment callback", async () => {
    const { client, inviteUserByEmail } = createClient();
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    await expect(
      gateway.inviteIdentity("admin.novo@example.com"),
    ).resolves.toEqual({
      email: "admin.novo@example.com",
      id: "20000000-0000-4000-8000-000000000009",
    });
    expect(inviteUserByEmail).toHaveBeenCalledWith("admin.novo@example.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });
  });

  it("returns no identity when Supabase rejects or omits the invite", async () => {
    const { client } = createClient({ fails: true });
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    await expect(
      gateway.inviteIdentity("admin.novo@example.com"),
    ).resolves.toBeNull();
  });

  it("creates a confirmed password identity and marks the initial password as seeded", async () => {
    const { client, createUser } = createClient();
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "https://www.contentecreators.com/auth/callback",
    });

    await expect(
      gateway.preparePasswordIdentity({
        email: "admin.novo@example.com",
        existingIdentity: null,
        password: "example-only-production-password",
      }),
    ).resolves.toEqual({
      identity: {
        email: "admin.novo@example.com",
        id: "20000000-0000-4000-8000-000000000009",
      },
      passwordSeeded: true,
    });
    expect(createUser).toHaveBeenCalledWith({
      app_metadata: { production_admin_password_seeded: true },
      email: "admin.novo@example.com",
      email_confirm: true,
      password: "example-only-production-password",
    });
  });

  it("inspects an existing identity without resetting its password", async () => {
    const { client, getUserById, updateUserById } = createClient();
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "https://www.contentecreators.com/auth/callback",
    });
    const identity = {
      email: "admin.existente@example.com",
      id: "20000000-0000-4000-8000-000000000008",
    };

    await expect(
      gateway.preparePasswordIdentity({
        email: identity.email,
        existingIdentity: identity,
        password: "example-only-production-password",
      }),
    ).resolves.toEqual({
      identity,
      passwordSeeded: false,
    });
    expect(getUserById).toHaveBeenCalledWith(identity.id);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("sets the one-time password only after account provisioning succeeds", async () => {
    const { client, updateUserById } = createClient();
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "https://www.contentecreators.com/auth/callback",
    });
    const identity = {
      email: "admin.existente@example.com",
      id: "20000000-0000-4000-8000-000000000008",
    };

    await expect(
      gateway.seedExistingPassword({
        identity,
        password: "example-only-production-password",
      }),
    ).resolves.toEqual(identity);
    expect(updateUserById).toHaveBeenCalledWith(identity.id, {
      app_metadata: {
        production_admin_password_seeded: true,
        provider: "email",
      },
      email_confirm: true,
      password: "example-only-production-password",
    });
  });
});
