import { describe, expect, it } from "vitest";

import { normalizeWhatsapp } from "./brazilian-whatsapp";

describe("Brazilian WhatsApp normalization", () => {
  it.each([
    ["(55) 98920-5885", "+5555989205885"],
    ["(55) 3222-1234", "+555532221234"],
    ["+55 (55) 98920-5885", "+5555989205885"],
    ["+55 (55) 3222-1234", "+555532221234"],
    ["5555989205885", "+5555989205885"],
    ["(49) 98885-0822", "+5549988850822"],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeWhatsapp(value)).toBe(expected);
    expect(normalizeWhatsapp(expected)).toBe(expected);
  });
});
