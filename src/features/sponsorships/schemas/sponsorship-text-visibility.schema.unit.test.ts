import { describe, expect, it } from "vitest";

import { sponsorshipPlacementDraftSchema } from "./sponsorship-placement.schema";

const draft = {
  audience: "ALL",
  body: null,
  creativeAssetId: null,
  placementType: "TOP_BANNER",
  slotKey: "catalog-top",
  title: null,
} as const;

function issuePaths(input: Record<string, unknown>) {
  const result = sponsorshipPlacementDraftSchema.safeParse({
    ...draft,
    ...input,
  });
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("sponsorship title and text visibility", () => {
  it("defaults both flags to false so nothing is shown unless chosen", () => {
    const parsed = sponsorshipPlacementDraftSchema.parse({
      ...draft,
      body: "Texto de apoio",
      title: "Título interno",
    });

    expect(parsed.showTitle).toBe(false);
    expect(parsed.showBody).toBe(false);
  });

  it("accepts a stored title and text that are hidden on the creative", () => {
    expect(
      issuePaths({
        body: "Texto interno",
        showBody: false,
        showTitle: false,
        title: "Título interno",
      }),
    ).toEqual([]);
  });

  it("accepts a visible title when the title is filled", () => {
    expect(issuePaths({ showTitle: true, title: "Campanha" })).toEqual([]);
  });

  it("rejects showing a title without a title", () => {
    expect(issuePaths({ showTitle: true, title: null })).toContain("showTitle");
  });

  it("rejects showing a text without a text", () => {
    expect(issuePaths({ body: null, showBody: true })).toContain("showBody");
  });
});
