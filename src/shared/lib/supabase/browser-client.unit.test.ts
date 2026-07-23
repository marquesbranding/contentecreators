import { createBrowserClient } from "@supabase/ssr";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ client: "browser" })),
}));

const mockedCreateBrowserClient = vi.mocked(createBrowserClient);

describe("browser Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_local_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  });

  it("creates one browser client with the publishable credential", async () => {
    const { getBrowserSupabaseClient } = await import("./browser-client");

    const firstClient = getBrowserSupabaseClient();
    const secondClient = getBrowserSupabaseClient();

    expect(firstClient).toBe(secondClient);
    expect(mockedCreateBrowserClient).toHaveBeenCalledOnce();
    expect(mockedCreateBrowserClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "sb_publishable_local_test",
    );
  });
});
