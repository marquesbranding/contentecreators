import { describe, expect, it } from "vitest";

import { catalogNoStoreHeaders } from "./catalog-freshness.policy";

describe("catalog freshness policy", () => {
  it("forbids browser and intermediary caching of protected catalog DTOs", () => {
    expect(catalogNoStoreHeaders).toEqual({
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    });
  });
});
