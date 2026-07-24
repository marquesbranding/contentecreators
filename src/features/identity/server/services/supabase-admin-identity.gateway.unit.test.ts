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
  const client = {
    auth: {
      admin: {
        inviteUserByEmail,
      },
    },
  } as unknown as SupabaseClient;

  return { client, inviteUserByEmail };
}

describe("Supabase admin identity gateway", () => {
  it("invites through the server-only Admin API with an environment callback", async () => {
    const { client, inviteUserByEmail } = createClient();
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password",
    });

    await expect(
      gateway.inviteIdentity("admin.novo@example.com"),
    ).resolves.toEqual({
      email: "admin.novo@example.com",
      id: "20000000-0000-4000-8000-000000000009",
    });
    expect(inviteUserByEmail).toHaveBeenCalledWith("admin.novo@example.com", {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password",
    });
  });

  it("returns no identity when Supabase rejects or omits the invite", async () => {
    const { client } = createClient({ fails: true });
    const gateway = createSupabaseAdminIdentityGateway(client, {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password",
    });

    await expect(
      gateway.inviteIdentity("admin.novo@example.com"),
    ).resolves.toBeNull();
  });
});
