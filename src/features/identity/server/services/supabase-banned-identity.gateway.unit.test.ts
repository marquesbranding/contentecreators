import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseBannedIdentityGateway } from "./supabase-banned-identity.gateway";

function createClients(options?: { providerFailure?: boolean }) {
  const getSession = vi.fn(async () => ({
    data: {
      session: {
        access_token: "current-access-token",
      },
    },
    error: null,
  }));
  const getUser = vi.fn(async () => ({
    data: {
      user: {
        id: "20000000-0000-4000-8000-000000000006",
      },
    },
    error: null,
  }));
  const localSignOut = vi.fn(async () => ({ error: null }));
  const adminSignOut = vi.fn(async () => ({
    data: null,
    error: options?.providerFailure ? { message: "failure" } : null,
  }));
  const updateUserById = vi.fn(async () => ({
    data: {
      user: options?.providerFailure ? null : { id: "identity" },
    },
    error: options?.providerFailure ? { message: "failure" } : null,
  }));
  const sessionClient = {
    auth: {
      getSession,
      getUser,
      signOut: localSignOut,
    },
  } as unknown as SupabaseClient;
  const adminClient = {
    auth: {
      admin: {
        signOut: adminSignOut,
        updateUserById,
      },
    },
  } as unknown as SupabaseClient;

  return {
    adminClient,
    adminSignOut,
    getSession,
    getUser,
    localSignOut,
    sessionClient,
    updateUserById,
  };
}

describe("Supabase banned identity gateway", () => {
  it("revokes globally, applies a long administrative Auth ban, and clears local cookies", async () => {
    const clients = createClients();
    const gateway = createSupabaseBannedIdentityGateway(
      clients.sessionClient,
      clients.adminClient,
    );

    await expect(gateway.getCurrentAccessToken()).resolves.toBe(
      "current-access-token",
    );
    await expect(gateway.resolveCurrentIdentityId()).resolves.toBe(
      "20000000-0000-4000-8000-000000000006",
    );
    await expect(
      gateway.revokeAccessToken("current-access-token"),
    ).resolves.toBe(true);
    await expect(
      gateway.banIdentity("20000000-0000-4000-8000-000000000006"),
    ).resolves.toBe(true);
    await gateway.signOut();

    expect(clients.adminSignOut).toHaveBeenCalledWith(
      "current-access-token",
      "global",
    );
    expect(clients.updateUserById).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000006",
      {
        ban_duration: "876000h",
      },
    );
    expect(clients.localSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns false for provider-side revocation failures without exposing details", async () => {
    const clients = createClients({ providerFailure: true });
    const gateway = createSupabaseBannedIdentityGateway(
      clients.sessionClient,
      clients.adminClient,
    );

    await expect(
      gateway.revokeAccessToken("current-access-token"),
    ).resolves.toBe(false);
    await expect(
      gateway.banIdentity("20000000-0000-4000-8000-000000000006"),
    ).resolves.toBe(false);
  });
});
