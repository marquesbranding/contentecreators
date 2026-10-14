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

  it("serializes the seal filters as cdl=1 and jornada=1 and reads them back", () => {
    const params = createDirectoryUrlSearchParams(new URLSearchParams(), {
      cdl: true,
      jornada: true,
    });

    expect(params.get("cdl")).toBe("1");
    expect(params.get("jornada")).toBe("1");

    const filters = readDirectoryUrlState(params);
    expect(filters.cdl).toBe(true);
    expect(filters.jornada).toBe(true);
    expect(hasDirectoryActiveFilters(filters)).toBe(true);
  });

  it("removes a seal filter from the URL when it is unchecked and resets the cursor", () => {
    const withSeal = createDirectoryUrlSearchParams(new URLSearchParams(), {
      jornada: true,
    });
    withSeal.set("cursor", "abc123");

    const next = createDirectoryUrlSearchParams(withSeal, {
      jornada: undefined,
    });

    expect(next.get("jornada")).toBeNull();
    expect(next.get("cursor")).toBeNull();
  });

  it("clears both seal filters on clear", () => {
    const withSeals = createDirectoryUrlSearchParams(new URLSearchParams(), {
      cdl: true,
      jornada: true,
    });

    const cleared = createDirectoryUrlSearchParams(withSeals, "clear");

    expect(cleared.get("cdl")).toBeNull();
    expect(cleared.get("jornada")).toBeNull();
  });
});
