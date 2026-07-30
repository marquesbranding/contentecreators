import { describe, expect, it, vi } from "vitest";

import { createPublicAggregateCountersRouteHandler } from "./public-aggregate-counters.handler";

describe("public aggregate counters Route Handler", () => {
  it("returns cacheable optional aggregate data", async () => {
    const handler = createPublicAggregateCountersRouteHandler({
      load: vi.fn(async () => ({ approvedCreators: 24 })),
    });

    const response = await handler();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    await expect(response.json()).resolves.toEqual({ approvedCreators: 24 });
  });

  it("isolates an unavailable dependency behind an empty no-store response", async () => {
    const handler = createPublicAggregateCountersRouteHandler({
      load: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    const response = await handler();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toBeNull();
  });
});
