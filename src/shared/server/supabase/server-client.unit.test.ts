import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "./server-client";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ client: "server" })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockedCreateServerClient = vi.mocked(createServerClient);
const mockedCookies = vi.mocked(cookies);

describe("server Supabase client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_local_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  });

  it("adapts the Next cookie store and never requires a service-role key", async () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: "existing", value: "cookie" }]),
      set: vi.fn(),
    };
    mockedCookies.mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createServerSupabaseClient();

    expect(mockedCreateServerClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "sb_publishable_local_test",
      expect.any(Object),
    );
    const configuration = mockedCreateServerClient.mock.calls[0]?.[2];

    expect(configuration?.cookies?.getAll?.()).toEqual([
      { name: "existing", value: "cookie" },
    ]);
    configuration?.cookies?.setAll?.(
      [
        {
          name: "refreshed",
          options: { httpOnly: true },
          value: "token",
        },
      ],
      {},
    );
    expect(cookieStore.set).toHaveBeenCalledWith("refreshed", "token", {
      httpOnly: true,
    });
  });
});
