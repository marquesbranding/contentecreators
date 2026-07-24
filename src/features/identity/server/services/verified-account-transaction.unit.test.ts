import { describe, expect, it, vi } from "vitest";

import { createSupabaseVerifiedAuthUserIdResolver } from "./verified-account-transaction";

describe("Supabase verified auth user resolver", () => {
  it("returns only the user id validated by Supabase Auth", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "10000000-0000-4000-8000-000000000001",
        },
      },
      error: null,
    });
    const resolveVerifiedAuthUserId = createSupabaseVerifiedAuthUserIdResolver({
      auth: { getUser },
    });

    await expect(resolveVerifiedAuthUserId()).resolves.toBe(
      "10000000-0000-4000-8000-000000000001",
    );
    expect(getUser).toHaveBeenCalledOnce();
  });

  it.each([
    {
      data: { user: null },
      error: null,
      scenario: "missing user",
    },
    {
      data: {
        user: {
          id: "10000000-0000-4000-8000-000000000001",
        },
      },
      error: { message: "invalid JWT" },
      scenario: "provider validation error",
    },
  ])("rejects $scenario", async ({ data, error }) => {
    const resolveVerifiedAuthUserId = createSupabaseVerifiedAuthUserIdResolver({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data,
          error,
        }),
      },
    });

    await expect(resolveVerifiedAuthUserId()).resolves.toBeNull();
  });
});
