import { describe, expect, it } from "vitest";

import {
  companyCarouselItemSchema,
  parseCompanyCarouselLimit,
  toSafeCompanyWebsiteUrl,
} from "./company-carousel.schema";

describe("company carousel schema", () => {
  it("accepts only strict presentation fields", () => {
    const safeItem = {
      displayName: "Marca Segura",
      logo: {
        alt: "Logo da Marca Segura",
        assetId: "90000000-0000-4000-8000-000000000001",
      },
      websiteUrl: "https://marca.example/",
    };

    expect(companyCarouselItemSchema.parse(safeItem)).toEqual(safeItem);
    expect(() =>
      companyCarouselItemSchema.parse({
        ...safeItem,
        cnpj: "12345678000195",
      }),
    ).toThrow();
    expect(() =>
      companyCarouselItemSchema.parse({
        ...safeItem,
        websiteUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("normalizes safe HTTP(S) links and rejects unsafe or credentialed links", () => {
    expect(toSafeCompanyWebsiteUrl("https://marca.example/sobre")).toBe(
      "https://marca.example/sobre",
    );
    expect(toSafeCompanyWebsiteUrl("http://marca.example")).toBe(
      "http://marca.example/",
    );
    expect(toSafeCompanyWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(
      toSafeCompanyWebsiteUrl("https://usuario:segredo@marca.example"),
    ).toBeNull();
    expect(toSafeCompanyWebsiteUrl("not-a-url")).toBeNull();
    expect(toSafeCompanyWebsiteUrl(null)).toBeNull();
  });

  it("keeps carousel requests deterministically bounded", () => {
    expect(parseCompanyCarouselLimit(undefined)).toBe(12);
    expect(parseCompanyCarouselLimit(1)).toBe(1);
    expect(parseCompanyCarouselLimit(24)).toBe(24);
    expect(parseCompanyCarouselLimit(25)).toBe(24);
    expect(parseCompanyCarouselLimit(-1)).toBe(12);
    expect(parseCompanyCarouselLimit(4.5)).toBe(12);
    expect(parseCompanyCarouselLimit(Number.NaN)).toBe(12);
  });
});
