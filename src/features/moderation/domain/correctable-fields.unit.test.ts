import { describe, expect, it } from "vitest";

import {
  CORRECTABLE_FIELDS_BY_ROLE,
  getCorrectableFieldLabel,
  groupCorrectableFieldsBySection,
} from "./correctable-fields";

describe("correctable fields", () => {
  it("has unique keys within each role", () => {
    for (const role of ["INFLUENCER", "COMPANY"] as const) {
      const keys = CORRECTABLE_FIELDS_BY_ROLE[role].map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("looks up a known field's pt-BR label", () => {
    expect(getCorrectableFieldLabel("cnpj")).toBe("CNPJ");
    expect(getCorrectableFieldLabel("bio")).toBe("Sobre o conteúdo");
  });

  it("falls back to the raw key for an unknown field", () => {
    expect(getCorrectableFieldLabel("something_unlisted")).toBe(
      "something_unlisted",
    );
  });

  it("groups a role's fields by section", () => {
    const grouped = groupCorrectableFieldsBySection("COMPANY");

    expect(grouped.get("location")?.map((field) => field.key)).toEqual([
      "location",
      "primaryLocation",
      "additionalLocations",
    ]);
    expect(grouped.get("media")?.map((field) => field.key)).toEqual([
      "avatar",
      "logo",
      "cover",
    ]);
  });
});
