import { describe, expect, it } from "vitest";

import {
  getAdminEmailAttemptOutcomeLabel,
  getAdminEmailRetryExplanation,
  getAdminEmailStatusLabel,
  getAdminEmailTemplateLabel,
} from "./admin-email-outbox-presentation";

describe("admin email outbox presentation", () => {
  it("presents internal enums in polished pt-BR", () => {
    expect(getAdminEmailStatusLabel("DEAD_LETTER")).toBe("Falha definitiva");
    expect(getAdminEmailTemplateLabel("CHANGES_REQUESTED")).toBe(
      "Correções solicitadas",
    );
    expect(getAdminEmailAttemptOutcomeLabel("TLS_FAILURE")).toBe(
      "Falha na conexão segura",
    );
  });

  it("explains manual retry eligibility without promising duplicate delivery", () => {
    expect(
      getAdminEmailRetryExplanation({
        eligible: true,
        reason: "ELIGIBLE",
      }),
    ).toContain("nova tentativa");
    expect(
      getAdminEmailRetryExplanation({
        eligible: false,
        reason: "AUTOMATIC_RETRY",
      }),
    ).toContain("automaticamente");
  });
});
