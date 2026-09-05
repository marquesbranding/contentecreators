import { describe, expect, it } from "vitest";

import {
  decodeDirectoryCursor,
  encodeDirectoryCursor,
} from "./catalog-directory-cursor";

describe("catalog directory cursor", () => {
  it("round-trips the deterministic created-at, kind and id boundary", () => {
    const payload = {
      createdAt: "2026-08-01T12:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR" as const,
    };
    const cursor = encodeDirectoryCursor(payload);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeDirectoryCursor(cursor)).toEqual(payload);
  });

  it.each([
    "bm90LWpzb24",
    btoa(
      JSON.stringify({
        createdAt: "2026-08-01T12:00:00.000Z",
        id: "not-a-uuid",
        kind: "CREATOR",
      }),
    ),
  ])("rejects invalid opaque payload %s", (cursor) => {
    expect(() => decodeDirectoryCursor(cursor)).toThrow(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });

  it("returns null for an absent cursor", () => {
    expect(decodeDirectoryCursor(undefined)).toBeNull();
  });
});
