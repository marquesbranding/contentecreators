import { describe, expect, it } from "vitest";

import { isValidCnpj, normalizeCnpj } from "./cnpj";

describe("CNPJ", () => {
  it("normalizes punctuation before validating both check digits", () => {
    expect(normalizeCnpj("11.222.333/0001-81")).toBe("11222333000181");
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it.each(["", "00000000000000", "11222333000182", "123"])(
    "rejects invalid value %s",
    (value) => {
      expect(isValidCnpj(value)).toBe(false);
    },
  );
});
