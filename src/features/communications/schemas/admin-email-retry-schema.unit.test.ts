import { describe, expect, it } from "vitest";

import { adminEmailRetrySchema } from "./admin-email-retry-schema";

describe("admin email retry schema", () => {
  const validCommand = {
    outboxId: "99999999-9999-4999-8999-999999999999",
    reason: "Reenvio solicitado após correção do SMTP",
    requestId: "manual-retry-request",
  };

  it("normalizes a valid administrative reason", () => {
    expect(
      adminEmailRetrySchema.parse({
        ...validCommand,
        reason: "  Reenvio autorizado pela operação  ",
      }),
    ).toEqual({
      ...validCommand,
      reason: "Reenvio autorizado pela operação",
    });
  });

  it.each([
    [{ ...validCommand, outboxId: "unsafe" }, "Mensagem de e-mail inválida."],
    [{ ...validCommand, reason: "" }, "Informe o motivo do reenvio."],
    [{ ...validCommand, requestId: "short" }, undefined],
  ])("rejects an invalid administrative retry", (input, message) => {
    const result = adminEmailRetrySchema.safeParse(input);

    expect(result.success).toBe(false);
    if (message && !result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });
});
