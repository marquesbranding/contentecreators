import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseModerationIdentityGateway } from "./supabase-moderation-identity.gateway";

function createClient(fails = false) {
  const updateUserById = vi.fn(async () => ({
    data: {
      user: fails ? null : { id: "20000000-0000-4000-8000-000000000004" },
    },
    error: fails ? { message: "provider unavailable" } : null,
  }));
  const client = {
    auth: {
      admin: {
        updateUserById,
      },
    },
  } as unknown as SupabaseClient;

  return {
    client,
    updateUserById,
  };
}

describe("Supabase moderation identity gateway", () => {
  it("applies a long administrative ban", async () => {
    const { client, updateUserById } = createClient();
    const gateway = createSupabaseModerationIdentityGateway(client);

    await expect(
      gateway.syncAuthIdentity({
        action: "BAN",
        authUserId: "20000000-0000-4000-8000-000000000004",
      }),
    ).resolves.toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000004",
      {
        ban_duration: "876000h",
      },
    );
  });

  it("removes the administrative ban during exceptional recovery", async () => {
    const { client, updateUserById } = createClient();
    const gateway = createSupabaseModerationIdentityGateway(client);

    await expect(
      gateway.syncAuthIdentity({
        action: "UNBAN",
        authUserId: "20000000-0000-4000-8000-000000000004",
      }),
    ).resolves.toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000004",
      {
        ban_duration: "none",
      },
    );
  });

  it("returns a safe failure result for retry tracking", async () => {
    const { client } = createClient(true);
    const gateway = createSupabaseModerationIdentityGateway(client);

    await expect(
      gateway.syncAuthIdentity({
        action: "BAN",
        authUserId: "20000000-0000-4000-8000-000000000004",
      }),
    ).resolves.toBe(false);
  });
});
