import { describe, expect, it } from "vitest";

import {
  createDirectoryUrlSearchParams,
  hasDirectoryActiveFilters,
  readDirectoryUrlState,
} from "./directory-url-state";

describe("directory URL state", () => {
  it("round-trips a repeated type filter through the URL", () => {
    const params = createDirectoryUrlSearchParams(new URLSearchParams(), {
      type: ["COMPANY", "UGC"],
    });

    expect(params.getAll("type")).toEqual(["COMPANY", "UGC"]);

    const filters = readDirectoryUrlState(params);
    expect(filters.type).toEqual(["COMPANY", "UGC"]);
  });

  it("resets the cursor when a filter actually changes", () => {
    const current = createDirectoryUrlSearchParams(new URLSearchParams(), {
      niche: "moda",
    });
    const withCursor = new URLSearchParams(current);
    withCursor.set("cursor", "abc123");

    const next = createDirectoryUrlSearchParams(withCursor, {
      niche: "tecnologia",
    });

    expect(next.get("cursor")).toBeNull();
  });

  it("keeps the cursor when the patch does not change any filter", () => {
    const withCursor = createDirectoryUrlSearchParams(new URLSearchParams(), {
      niche: "moda",
    });
    withCursor.set("cursor", "abc123");

    const next = createDirectoryUrlSearchParams(withCursor, {
      niche: "moda",
    });

    expect(next.get("cursor")).toBe("abc123");
  });

  it("clears every filter, including type, on clear", () => {
    const withFilters = createDirectoryUrlSearchParams(new URLSearchParams(), {
      city: "São Paulo",
      type: ["COMPANY"],
    });

    const cleared = createDirectoryUrlSearchParams(withFilters, "clear");

    expect(cleared.getAll("type")).toEqual([]);
    expect(cleared.get("city")).toBeNull();
  });

  it("treats a selected type as an active filter", () => {
    expect(hasDirectoryActiveFilters({ pageSize: 20, type: ["COMPANY"] })).toBe(
      true,
    );
    expect(hasDirectoryActiveFilters({ pageSize: 20 })).toBe(false);
  });
});
