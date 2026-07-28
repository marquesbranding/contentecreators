import { describe, expect, it } from "vitest";

import {
  createCreatorCatalogUrlSearchParams,
  readCreatorCatalogUrlState,
} from "./catalog-url-state";

describe("creator catalog URL state", () => {
  it("reads canonical catalog filters from the URL", () => {
    expect(
      readCreatorCatalogUrlState(
        new URLSearchParams(
          "search=%20Moda%20&niche=beleza&platform=INSTAGRAM&city=Recife&state=pe&creatorType=UGC&pageSize=35&cursor=next_page",
        ),
      ),
    ).toEqual({
      city: "Recife",
      creatorType: "UGC",
      cursor: "next_page",
      niche: "beleza",
      pageSize: 35,
      platform: "INSTAGRAM",
      search: "Moda",
      state: "PE",
    });
  });

  it("resets the cursor whenever a filter changes", () => {
    const next = createCreatorCatalogUrlSearchParams(
      new URLSearchParams("search=Moda&state=SP&cursor=next_page&pageSize=20"),
      { search: "Beleza" },
    );

    expect(next.toString()).toBe("search=Beleza&state=SP&pageSize=20");
  });

  it("keeps the cursor when a patch does not change canonical filters", () => {
    const next = createCreatorCatalogUrlSearchParams(
      new URLSearchParams("search=Moda&state=SP&cursor=next_page&pageSize=20"),
      { search: " Moda " },
    );

    expect(next.get("cursor")).toBe("next_page");
  });

  it("clears filters to the bounded default page size", () => {
    expect(
      createCreatorCatalogUrlSearchParams(
        new URLSearchParams(
          "search=Moda&state=SP&cursor=next_page&pageSize=50",
        ),
        "clear",
      ).toString(),
    ).toBe("pageSize=20");
  });
});
