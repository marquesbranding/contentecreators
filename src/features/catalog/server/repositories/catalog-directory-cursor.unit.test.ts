import { describe, expect, it } from "vitest";

import {
  decodeDirectoryCursor,
  encodeDirectoryCursor,
} from "./catalog-directory-cursor";

const base64Url = (value: unknown) =>
  btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");

describe("catalog directory cursor", () => {
  it("round-trips the v2 shuffle seed, sort key, kind and id boundary", () => {
    const payload = {
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR" as const,
      seed: "2026-10-13",
      sortKey: "0123456789abcdef0123456789abcdef",
      v: 2 as const,
    };
    const cursor = encodeDirectoryCursor(payload);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeDirectoryCursor(cursor)).toEqual(payload);
  });

  it("discards a legacy v1 (created-at) cursor so the first page is served", () => {
    const legacy = base64Url({
      createdAt: "2026-08-01T12:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR",
    });

    expect(decodeDirectoryCursor(legacy)).toBeNull();
  });

  it.each([
    "bm90LWpzb24",
    base64Url({
      createdAt: "2026-08-01T12:00:00.000Z",
      id: "not-a-uuid",
      kind: "CREATOR",
    }),
    base64Url({
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR",
      seed: "2026-10-13",
      sortKey: "not-a-hash",
      v: 2,
    }),
    base64Url({
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR",
      seed: "13/10/2026",
      sortKey: "0123456789abcdef0123456789abcdef",
      v: 2,
    }),
    base64Url({
      id: "00000000-0000-4000-8000-000000000018",
      kind: "CREATOR",
      seed: "2026-10-13",
      sortKey: "0123456789abcdef0123456789abcdef",
      v: 3,
    }),
  ])("rejects invalid opaque payload %s", (cursor) => {
    expect(() => decodeDirectoryCursor(cursor)).toThrow(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });

  it("returns null for an absent cursor", () => {
    expect(decodeDirectoryCursor(undefined)).toBeNull();
  });
});
