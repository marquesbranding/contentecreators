import { describe, expect, it } from "vitest";

import {
  CREATOR_CATALOG_DEFAULT_PAGE_SIZE,
  CREATOR_CATALOG_MAX_PAGE_SIZE,
  creatorCatalogFiltersSchema,
} from "./creator-catalog.schema";

describe("creator catalog schemas", () => {
  it("applies bounded defaults and normalizes URL-owned filters", () => {
    expect(
      creatorCatalogFiltersSchema.parse({
        city: "  São Paulo ",
        creatorType: "UGC",
        niche: "beleza",
        platform: "INSTAGRAM",
        search: "  júlia ",
        state: "sp",
      }),
    ).toEqual({
      city: "São Paulo",
      creatorType: "UGC",
      cursor: undefined,
      niche: "beleza",
      pageSize: CREATOR_CATALOG_DEFAULT_PAGE_SIZE,
      platform: "INSTAGRAM",
      search: "júlia",
      state: "SP",
    });
  });

  it("rejects excessive page sizes and malformed cursors", () => {
    expect(() =>
      creatorCatalogFiltersSchema.parse({
        pageSize: CREATOR_CATALOG_MAX_PAGE_SIZE + 1,
      }),
    ).toThrow();
    expect(() =>
      creatorCatalogFiltersSchema.parse({ cursor: "not a valid cursor!" }),
    ).toThrow();
  });

  it("rejects non-exclusive creator type inputs", () => {
    expect(() =>
      creatorCatalogFiltersSchema.parse({
        creatorType: ["INFLUENCER", "UGC"],
      }),
    ).toThrow();
  });
});
