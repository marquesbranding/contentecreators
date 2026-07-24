import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseMediaCleanupGateway,
  MediaCleanupStorageError,
} from "./supabase-media-cleanup.gateway";

function createClient(error: { message: string } | null) {
  const remove = vi.fn(async () => ({
    data: error ? null : [],
    error,
  }));
  const from = vi.fn(() => ({ remove }));
  const client = {
    storage: {
      from,
    },
  } as unknown as SupabaseClient;

  return { client, from, remove };
}

describe("Supabase media cleanup gateway", () => {
  it("removes an approved batch through the Storage API", async () => {
    const { client, from, remove } = createClient(null);
    const gateway = createSupabaseMediaCleanupGateway(client);

    await gateway.removeObjects({
      bucketName: "profile-media",
      objectPaths: ["owner/avatar/old.png"],
    });

    expect(from).toHaveBeenCalledWith("profile-media");
    expect(remove).toHaveBeenCalledWith(["owner/avatar/old.png"]);
  });

  it("raises a sanitized operational error when Storage rejects removal", async () => {
    const { client } = createClient({
      message: "provider detail with private object path",
    });
    const gateway = createSupabaseMediaCleanupGateway(client);

    await expect(
      gateway.removeObjects({
        bucketName: "sponsorship-media",
        objectPaths: ["admin/sponsorship-creative/private.webp"],
      }),
    ).rejects.toEqual(new MediaCleanupStorageError());
  });
});
