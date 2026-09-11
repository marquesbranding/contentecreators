import { describe, expect, it, vi } from "vitest";

import { fetchPublicCommunityProof } from "./public-community-proof.api";

const company = {
  city: null,
  companyId: "company-1",
  segment: "Moda",
  state: null,
  tradeName: "Marca Beta",
};

function respondWith(payload: unknown) {
  return vi.fn(async () => ({ json: async () => payload, ok: true }));
}

describe("public community proof API", () => {
  it("accepts the approved-brands marquee without credentials", async () => {
    const request = respondWith({ companies: [company] });
    const controller = new AbortController();

    await expect(
      fetchPublicCommunityProof(controller.signal, request),
    ).resolves.toEqual({ companies: [company] });
    expect(request).toHaveBeenCalledWith(
      "/api/public/marketing/community-proof",
      expect.objectContaining({
        credentials: "omit",
        signal: controller.signal,
      }),
    );
  });

  it("keeps an empty list as a valid answer", async () => {
    await expect(
      fetchPublicCommunityProof(
        new AbortController().signal,
        respondWith({ companies: [] }),
      ),
    ).resolves.toEqual({ companies: [] });
  });

  it.each([
    ["transport failure", vi.fn().mockRejectedValue(new Error("offline"))],
    [
      "a company carrying contact data",
      respondWith({ companies: [{ ...company, email: "x@y.test" }] }),
    ],
    [
      "creators, which this endpoint no longer serves",
      respondWith({ companies: [company], creators: [] }),
    ],
    [
      "non-success response",
      vi.fn(async () => ({ json: async () => null, ok: false })),
    ],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicCommunityProof(new AbortController().signal, request),
    ).resolves.toBeNull();
  });
});
