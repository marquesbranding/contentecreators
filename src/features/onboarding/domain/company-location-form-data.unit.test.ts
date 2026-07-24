import { describe, expect, it } from "vitest";

import { readAdditionalCompanyLocations } from "./company-location-form-data";

describe("additional company location FormData", () => {
  it("collects allowed fields in DOM order and ignores unrelated keys", () => {
    const formData = new FormData();
    formData.set("additionalLocations.branch-a.label", "Filial Sul");
    formData.set("additionalLocations.branch-a.street", "Rua das Flores");
    formData.set("additionalLocations.branch-a.number", "120");
    formData.set("additionalLocations.branch-a.complement", "");
    formData.set("additionalLocations.branch-a.neighborhood", "Centro");
    formData.set("additionalLocations.branch-a.city", "Curitiba");
    formData.set("additionalLocations.branch-a.state", "PR");
    formData.set("additionalLocations.branch-a.postalCode", "80010-000");
    formData.set("additionalLocations.branch-a.isPrimary", "true");
    formData.set("password", "must-not-be-collected");

    expect(readAdditionalCompanyLocations(formData)).toEqual([
      {
        city: "Curitiba",
        complement: "",
        label: "Filial Sul",
        neighborhood: "Centro",
        number: "120",
        postalCode: "80010-000",
        state: "PR",
        street: "Rua das Flores",
      },
    ]);
  });

  it("ignores malformed client identifiers and non-string values", () => {
    const formData = new FormData();
    formData.set("additionalLocations.invalid key.label", "Inválida");
    formData.set(
      "additionalLocations.valid.label",
      new File(["content"], "file.txt"),
    );

    expect(readAdditionalCompanyLocations(formData)).toEqual([]);
  });
});
