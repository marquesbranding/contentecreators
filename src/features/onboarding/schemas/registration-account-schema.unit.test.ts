import { describe, expect, it } from "vitest";
import { parseRegistrationAccount } from "./registration-account-schema";
const data = {
  fullName: "Pessoa Teste",
  accountType: "UGC",
  whatsapp: "(11) 99999-9999",
};
describe("registration account", () => {
  it("requires a strong matching password only for email identities without one", () => {
    expect(parseRegistrationAccount(data, false).success).toBe(true);
    expect(parseRegistrationAccount(data, true).success).toBe(false);
    expect(
      parseRegistrationAccount(
        { ...data, password: "Senha1234", passwordConfirmation: "different" },
        true,
      ).success,
    ).toBe(false);
    expect(
      parseRegistrationAccount(
        { ...data, password: "Senha1234", passwordConfirmation: "Senha1234" },
        true,
      ).success,
    ).toBe(true);
  });
  it("rejects incomplete names, invalid phones and privileged roles", () => {
    for (const extra of [
      { fullName: "A" },
      { whatsapp: "123" },
      { accountType: "ADMIN" },
    ])
      expect(
        parseRegistrationAccount({ ...data, ...extra }, false).success,
      ).toBe(false);
  });
});
