import { describe, expect, it } from "vitest";

import {
  DIRECTORY_DEFAULT_PAGE_SIZE,
  DIRECTORY_MAX_PAGE_SIZE,
  directoryFiltersSchema,
  parseDirectorySearchParams,
} from "./catalog-directory.schema";

describe("catalog directory schemas", () => {
  it("applies bounded defaults and normalizes URL-owned filters", () => {
    expect(
      directoryFiltersSchema.parse({
        city: "  São Paulo ",
        search: "  júlia ",
        state: "sp",
      }),
    ).toEqual({
      city: "São Paulo",
      cursor: undefined,
      followersMax: undefined,
      followersMin: undefined,
      interactionsMax: undefined,
      interactionsMin: undefined,
      newFollowersMax: undefined,
      newFollowersMin: undefined,
      niche: undefined,
      pageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
      platform: undefined,
      search: "júlia",
      segment: undefined,
      state: "SP",
      type: undefined,
      viewsMax: undefined,
      viewsMin: undefined,
    });
  });

  it("rejects excessive page sizes and malformed cursors", () => {
    expect(() =>
      directoryFiltersSchema.parse({
        pageSize: DIRECTORY_MAX_PAGE_SIZE + 1,
      }),
    ).toThrow();
    expect(() =>
      directoryFiltersSchema.parse({ cursor: "not a valid cursor!" }),
    ).toThrow();
  });

  it("parses repeated type query params into a multi-selection", () => {
    const searchParams = new URLSearchParams();
    searchParams.append("type", "COMPANY");
    searchParams.append("type", "UGC");

    expect(parseDirectorySearchParams(searchParams).type).toEqual([
      "COMPANY",
      "UGC",
    ]);
  });

  it("coerces numeric metric range filters from query strings", () => {
    expect(
      directoryFiltersSchema.parse({
        followersMax: "50000",
        followersMin: "1000",
      }),
    ).toMatchObject({ followersMax: 50_000, followersMin: 1_000 });
  });

  it("rejects an unknown type value", () => {
    expect(() =>
      directoryFiltersSchema.parse({ type: ["COMPANY", "ADMIN"] }),
    ).toThrow();
  });

  it("parses the cdl and jornada seal flags from 1 or true, ignoring other values", () => {
    const enabled = parseDirectorySearchParams(
      new URLSearchParams("cdl=1&jornada=true"),
    );
    const ignored = parseDirectorySearchParams(
      new URLSearchParams("cdl=0&jornada=no"),
    );
    const absent = directoryFiltersSchema.parse({});

    expect(enabled.cdl).toBe(true);
    expect(enabled.jornada).toBe(true);
    expect(ignored.cdl).toBeUndefined();
    expect(ignored.jornada).toBeUndefined();
    expect(absent.cdl).toBeUndefined();
    expect(absent.jornada).toBeUndefined();
  });
});
