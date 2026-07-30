import { describe, expect, it, vi } from "vitest";

import { fetchPublicAggregateCounters } from "./public-aggregate-counters.api";

describe("public aggregate counters API", () => {
  it("accepts only a bounded aggregate response without credentials", async () => {
    const request = vi.fn(async () => ({
      json: async () => ({
        approvedCompanies: 7,
        approvedCreators: 24,
      }),
      ok: true,
    }));
    const controller = new AbortController();

    await expect(
      fetchPublicAggregateCounters(controller.signal, request),
    ).resolves.toEqual({
      approvedCompanies: 7,
      approvedCreators: 24,
    });
    expect(request).toHaveBeenCalledWith(
      "/api/public/marketing/counters",
      expect.objectContaining({
        credentials: "omit",
        signal: controller.signal,
      }),
    );
  });

  it.each([
    ["transport failure", vi.fn().mockRejectedValue(new Error("offline"))],
    [
      "invalid payload",
      vi.fn(async () => ({
        json: async () => ({
          approvedCreators: -1,
          participantName: "Privado",
        }),
        ok: true,
      })),
    ],
    [
      "non-success response",
      vi.fn(async () => ({ json: async () => null, ok: false })),
    ],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicAggregateCounters(new AbortController().signal, request),
    ).resolves.toBeNull();
  });
});
