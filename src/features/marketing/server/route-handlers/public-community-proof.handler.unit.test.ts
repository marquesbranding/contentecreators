import { describe, expect, it, vi } from "vitest";

import { publicCommunityAvatarLifetimeSeconds } from "../services/server-public-community-proof.service";
import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";
import {
  createPublicCommunityProofRouteHandler,
  publicCommunityProofCacheWindowSeconds,
} from "./public-community-proof.handler";

describe("public community proof Route Handler", () => {
  it("returns cacheable optional community proof data", async () => {
    const proof: PublicCommunityProofDto = {
      companies: [],
      creators: [
        {
          avatar: null,
          bioExcerpt: null,
          city: null,
          creatorId: "creator-1",
          creatorType: "UGC",
          displayName: "Creator Beta",
          metric: null,
          niches: [],
          state: null,
        },
      ],
    };
    const handler = createPublicCommunityProofRouteHandler({
      load: vi.fn(async () => proof),
    });

    const response = await handler();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    await expect(response.json()).resolves.toEqual({
      companies: [],
      creators: [
        {
          avatar: null,
          bioExcerpt: null,
          city: null,
          creatorId: "creator-1",
          creatorType: "UGC",
          displayName: "Creator Beta",
          metric: null,
          niches: [],
          state: null,
        },
      ],
    });
  });

  it("keeps signed avatar URLs alive for the whole CDN window", async () => {
    const handler = createPublicCommunityProofRouteHandler({
      load: vi.fn(async () => null),
    });
    const cacheControl = (await handler()).headers.get("cache-control") ?? "";
    const maxAge = Number(/s-maxage=(\d+)/u.exec(cacheControl)?.[1]);
    const staleWhileRevalidate = Number(
      /stale-while-revalidate=(\d+)/u.exec(cacheControl)?.[1],
    );

    /* A response cached past the signature's expiry serves valid JSON with
     * dead image URLs — no error anywhere, just creators without photos. */
    expect(maxAge + staleWhileRevalidate).toBe(
      publicCommunityProofCacheWindowSeconds,
    );
    expect(publicCommunityAvatarLifetimeSeconds).toBeGreaterThan(
      publicCommunityProofCacheWindowSeconds,
    );
  });

  it("isolates an unavailable dependency behind an empty no-store response", async () => {
    const handler = createPublicCommunityProofRouteHandler({
      load: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    const response = await handler();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toBeNull();
  });
});
