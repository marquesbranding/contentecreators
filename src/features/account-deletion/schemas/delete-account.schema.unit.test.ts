import { describe, expect, it } from "vitest";

import { deleteAccountSchema } from "./delete-account.schema";

describe("delete account schema", () => {
  it("accepts the EXCLUIR phrase with the acknowledgement and asks for no password", () => {
    const parsed = deleteAccountSchema.safeParse({
      acknowledged: "on",
      confirmation: "EXCLUIR",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      acknowledged: "on",
      confirmation: "EXCLUIR",
    });
    expect(parsed.data).not.toHaveProperty("password");
  });

  it("ignores any password sent by an older form", () => {
    const parsed = deleteAccountSchema.safeParse({
      acknowledged: "on",
      confirmation: "excluir ",
      password: "old-form-value",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("password");
  });

  it("refuses a missing or wrong EXCLUIR phrase", () => {
    for (const confirmation of ["", "apagar", "EXCLUI"]) {
      const parsed = deleteAccountSchema.safeParse({
        acknowledged: "on",
        confirmation,
      });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.flatten().fieldErrors.confirmation).toEqual([
        "Digite EXCLUIR para confirmar.",
      ]);
    }
  });

  it("refuses when the acknowledgement is not checked", () => {
    const parsed = deleteAccountSchema.safeParse({
      confirmation: "EXCLUIR",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.acknowledged).toEqual([
      "Confirme que entendeu que a exclusão é irreversível.",
    ]);
  });
});
