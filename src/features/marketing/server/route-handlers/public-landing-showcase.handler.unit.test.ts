import { describe, expect, it, vi } from "vitest";

import { publicShowcaseImageLifetimeSeconds } from "../services/server-public-landing-showcase.service";
import {
  createPublicLandingShowcaseRouteHandler,
  publicLandingShowcaseCacheWindowSeconds,
} from "./public-landing-showcase.handler";

describe("public landing showcase Route Handler", () => {
  it("returns the showcase as cacheable public data", async () => {
    const response = await createPublicLandingShowcaseRouteHandler({
      load: vi.fn(async () => ({ items: [] })),
    })();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    await expect(response.json()).resolves.toEqual({ items: [] });
  });

  it("keeps signed image URLs alive for the whole CDN window", async () => {
    const response = await createPublicLandingShowcaseRouteHandler({
      load: vi.fn(async () => null),
    })();
    const cacheControl = response.headers.get("cache-control") ?? "";
    const maxAge = Number(/s-maxage=(\d+)/u.exec(cacheControl)?.[1]);
    const staleWhileRevalidate = Number(
      /stale-while-revalidate=(\d+)/u.exec(cacheControl)?.[1],
    );

    /* A response cached past the signature's expiry serves valid JSON with
     * dead image URLs — no error anywhere, just cards without photos. */
    expect(maxAge + staleWhileRevalidate).toBe(
      publicLandingShowcaseCacheWindowSeconds,
    );
    expect(publicShowcaseImageLifetimeSeconds).toBeGreaterThan(
      publicLandingShowcaseCacheWindowSeconds,
    );
  });

  it("isolates an unavailable dependency behind an empty no-store response", async () => {
    const response = await createPublicLandingShowcaseRouteHandler({
      load: vi.fn().mockRejectedValue(new Error("database unavailable")),
    })();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toBeNull();
  });
});
