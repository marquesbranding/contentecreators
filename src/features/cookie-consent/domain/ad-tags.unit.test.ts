import { describe, expect, it } from "vitest";

import { normalizeAdTagConfig } from "./ad-tags";

describe("normalizeAdTagConfig", () => {
  it("keeps well-formed ids", () => {
    expect(
      normalizeAdTagConfig({
        googleAdsConversionLabel: "AbCd-1234_x",
        googleAdsId: "AW-123456789",
        metaPixelId: "1234567890123",
      }),
    ).toEqual({
      googleAdsConversionLabel: "AbCd-1234_x",
      googleAdsId: "AW-123456789",
      metaPixelId: "1234567890123",
    });
  });

  it("drops empty or malformed values so nothing loads", () => {
    expect(
      normalizeAdTagConfig({
        googleAdsId: "javascript:alert(1)",
        metaPixelId: "' onerror=",
      }),
    ).toEqual({
      googleAdsConversionLabel: undefined,
      googleAdsId: undefined,
      metaPixelId: undefined,
    });
    expect(normalizeAdTagConfig({})).toEqual({
      googleAdsConversionLabel: undefined,
      googleAdsId: undefined,
      metaPixelId: undefined,
    });
  });
});
