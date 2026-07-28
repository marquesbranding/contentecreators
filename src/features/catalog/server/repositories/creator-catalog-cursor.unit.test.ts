import { describe, expect, it } from "vitest";

import {
  decodeCreatorCatalogCursor,
  encodeCreatorCatalogCursor,
} from "./creator-catalog-cursor";

describe("creator catalog cursor", () => {
  it("round-trips the deterministic display-name and profile-id boundary", () => {
    const payload = {
      creatorProfileId: "00000000-0000-4000-8000-000000000018",
      displayName: "Júlia Criadora",
    };
    const cursor = encodeCreatorCatalogCursor(payload);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeCreatorCatalogCursor(cursor)).toEqual(payload);
  });

  it.each([
    "bm90LWpzb24",
    btoa(
      JSON.stringify({
        creatorProfileId: "not-a-uuid",
        displayName: "Creator inválido",
      }),
    ),
  ])("rejects invalid opaque payload %s", (cursor) => {
    expect(() => decodeCreatorCatalogCursor(cursor)).toThrow(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    );
  });
});
