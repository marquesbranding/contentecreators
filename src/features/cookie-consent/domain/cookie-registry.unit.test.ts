import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { COOKIE_REGISTRY_VERSION, cookieTechnologies } from "./cookie-registry";

/**
 * When this fails, the cookie list changed: bump `COOKIE_REGISTRY_VERSION`
 * (which asks every visitor again) and update the expected pair below.
 */
const EXPECTED = {
  fingerprint: "41a5d3706dd0836e",
  version: 1,
};

describe("cookie registry", () => {
  it("changes the version whenever the list changes", () => {
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(cookieTechnologies))
      .digest("hex")
      .slice(0, 16);

    expect({ fingerprint, version: COOKIE_REGISTRY_VERSION }).toEqual(EXPECTED);
  });

  it("describes every technology completely", () => {
    for (const technology of cookieTechnologies) {
      expect(technology.name).not.toBe("");
      expect(technology.provider).not.toBe("");
      expect(technology.purpose).not.toBe("");
      expect(technology.duration).not.toBe("");
    }
  });
});
