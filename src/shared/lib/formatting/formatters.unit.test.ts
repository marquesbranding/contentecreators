import { describe, expect, it } from "vitest";

import {
  formatCnpj,
  formatDate,
  formatNumber,
  formatPercentage,
  formatPhone,
} from "./formatters";

describe("pt-BR formatters", () => {
  it.each([
    ["12345678000195", "12.345.678/0001-95"],
    ["12.345.678/0001-95", "12.345.678/0001-95"],
    ["123", "123"],
  ])("formats CNPJ %s", (input, expected) => {
    expect(formatCnpj(input)).toBe(expected);
  });

  it.each([
    ["11987654321", "(11) 98765-4321"],
    ["1132654321", "(11) 3265-4321"],
    ["123", "123"],
  ])("formats phone %s", (input, expected) => {
    expect(formatPhone(input)).toBe(expected);
  });

  it("formats dates in the product timezone", () => {
    expect(formatDate(new Date("2026-07-23T12:00:00Z"))).toBe(
      "23 de julho de 2026",
    );
  });

  it("formats decimal values", () => {
    expect(formatNumber(12_345.67, 2)).toBe("12.345,67");
  });

  it("formats ratios as percentages", () => {
    expect(formatPercentage(0.135, 1)).toBe("13,5%");
  });
});
