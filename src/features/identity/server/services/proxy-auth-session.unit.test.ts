import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateProxyAuthSession } from "./proxy-auth-session";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const mockedCreateServerClient = vi.mocked(createServerClient);

function mockSessionRefresh(user: object | null) {
  mockedCreateServerClient.mockImplementation((_url, _key, configuration) => ({
    auth: {
      getUser: vi.fn(async () => {
        configuration.cookies?.setAll?.(
          [
            {
              name: "sb-session",
              options: {
                httpOnly: true,
                sameSite: "lax",
              },
              value: "refreshed-token",
            },
          ],
          {
            "Cache-Control": "private, no-store",
            Vary: "Cookie",
          },
        );

        return { data: { user } };
      }),
    },
  }));
}

describe("proxy auth session", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_local_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  });

  it("preserves refreshed cookies and headers on a login redirect", async () => {
    mockSessionRefresh(null);

    const response = await updateProxyAuthSession(
      new NextRequest("http://localhost:3000/app/catalog?city=Recife"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fapp%2Fcatalog%3Fcity%3DRecife",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed-token");
  });

  it("continues authenticated requests with the refreshed auth state", async () => {
    mockSessionRefresh({ id: "identity-id" });

    const response = await updateProxyAuthSession(
      new NextRequest("http://localhost:3000/onboarding/role"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed-token");
  });

  it("uses only the public Supabase credential", async () => {
    mockSessionRefresh(null);

    await updateProxyAuthSession(
      new NextRequest("http://localhost:3000/login"),
    );

    expect(mockedCreateServerClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "sb_publishable_local_test",
      expect.any(Object),
    );
  });
});
