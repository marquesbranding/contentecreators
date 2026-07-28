import { describe, expect, it } from "vitest";

import { createPublicAggregateCountersService } from "./public-aggregate-counters.service";

describe("public aggregate counters service", () => {
  it("returns only meaningful approved aggregates", async () => {
    const service = createPublicAggregateCountersService({
      loadApprovedCounts: async () => ({
        approvedCompanies: 0,
        approvedCreators: 12,
      }),
    });

    await expect(service.load()).resolves.toEqual({
      approvedCreators: 12,
    });
  });

  it("omits the payload when every aggregate is empty", async () => {
    const service = createPublicAggregateCountersService({
      loadApprovedCounts: async () => ({
        approvedCompanies: 0,
        approvedCreators: 0,
      }),
    });

    await expect(service.load()).resolves.toBeNull();
  });

  it("fails closed without returning a misleading counter", async () => {
    const service = createPublicAggregateCountersService({
      loadApprovedCounts: async () => {
        throw new Error("database unavailable");
      },
    });

    await expect(service.load()).resolves.toBeNull();
  });
});
