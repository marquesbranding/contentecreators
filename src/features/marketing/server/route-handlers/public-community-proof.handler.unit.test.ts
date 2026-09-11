import { describe, expect, it, vi } from "vitest";

import { createPublicCommunityProofRouteHandler } from "./public-community-proof.handler";

describe("public community proof Route Handler", () => {
  it("returns cacheable marquee data", async () => {
    const proof = {
      companies: [
        {
          city: null,
          companyId: "company-1",
          segment: null,
          state: null,
          tradeName: "Marca Beta",
        },
      ],
    };
    const response = await createPublicCommunityProofRouteHandler({
      load: vi.fn(async () => proof),
    })();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    await expect(response.json()).resolves.toEqual(proof);
  });

  it("isolates an unavailable dependency behind an empty no-store response", async () => {
    const response = await createPublicCommunityProofRouteHandler({
      load: vi.fn().mockRejectedValue(new Error("database unavailable")),
    })();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toBeNull();
  });
});
