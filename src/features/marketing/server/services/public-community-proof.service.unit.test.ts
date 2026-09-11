import { describe, expect, it } from "vitest";

import { createPublicCommunityProofService } from "./public-community-proof.service";

const company = {
  city: "São Paulo",
  companyId: "company-1",
  segment: "Alimentação",
  state: "SP",
  tradeName: "Empresa Quatro",
};

describe("public community proof service", () => {
  it("returns the approved companies for the marquee", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({ companies: [company] }),
    });

    await expect(service.load()).resolves.toEqual({ companies: [company] });
  });

  it("answers with an empty list when no company is approved yet", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({ companies: [] }),
    });

    await expect(service.load()).resolves.toEqual({ companies: [] });
  });

  it("fails closed when loading fails", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => {
        throw new Error("database unavailable");
      },
    });

    await expect(service.load()).resolves.toBeNull();
  });
});
