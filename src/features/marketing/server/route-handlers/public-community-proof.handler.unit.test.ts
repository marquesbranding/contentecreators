import { describe, expect, it, vi } from "vitest";

import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";
import { createPublicCommunityProofRouteHandler } from "./public-community-proof.handler";

describe("public community proof Route Handler", () => {
  it("returns cacheable optional community proof data", async () => {
    const proof: PublicCommunityProofDto = {
      companies: [],
      creators: [
        {
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
