import { describe, expect, it, vi } from "vitest";

import { invalidateCatalogEligibilityPaths } from "./catalog-eligibility-invalidation.policy";

describe("catalog eligibility invalidation policy", () => {
  it("invalidates catalog and every saved creator detail after eligibility changes", () => {
    const revalidatePath = vi.fn();

    invalidateCatalogEligibilityPaths(revalidatePath);

    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/catalog");
    expect(revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/app/creators/[creatorId]",
      "page",
    );
  });
});
