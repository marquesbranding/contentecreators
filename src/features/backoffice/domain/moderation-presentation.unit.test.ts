import { describe, expect, it } from "vitest";

import {
  getAvailableModerationActions,
  getMediaStatusLabel,
  getModerationRoleLabel,
  getModerationStatusLabel,
  moderationApproveRequiresReason,
} from "./moderation-presentation";

describe("backoffice moderation presentation", () => {
  it.each([
    ["INFLUENCER", "Influenciador"],
    ["COMPANY", "Empresa"],
  ] as const)("translates role %s to pt-BR", (role, expected) => {
    expect(getModerationRoleLabel(role)).toBe(expected);
  });

  it.each([
    ["ONBOARDING", "Cadastro em andamento"],
    ["PENDING_REVIEW", "Aguardando análise"],
    ["CHANGES_REQUESTED", "Correções solicitadas"],
    ["APPROVED", "Aprovado"],
    ["SUSPENDED", "Suspenso"],
    ["BANNED", "Banido"],
  ] as const)("translates status %s to pt-BR", (status, expected) => {
    expect(getModerationStatusLabel(status)).toBe(expected);
  });

  it.each([
    ["ACTIVE", "Ativa"],
    ["ARCHIVED", "Arquivada"],
    ["PENDING", "Pendente"],
    ["REJECTED", "Rejeitada"],
  ] as const)("translates media status %s to pt-BR", (status, expected) => {
    expect(getMediaStatusLabel(status)).toBe(expected);
  });

  it("offers every real decision from a pending submission", () => {
    expect(getAvailableModerationActions("PENDING_REVIEW")).toEqual([
      "APPROVE",
      "REQUEST_CHANGES",
      "SUSPEND",
      "BAN",
      "ARCHIVE",
    ]);
  });

  it.each([
    ["APPROVED", ["REQUEST_CHANGES", "SUSPEND", "BAN", "ARCHIVE"]],
    ["SUSPENDED", ["APPROVE", "REQUEST_CHANGES", "BAN", "ARCHIVE"]],
    ["BANNED", ["APPROVE", "REQUEST_CHANGES", "SUSPEND", "ARCHIVE"]],
    ["CHANGES_REQUESTED", ["APPROVE", "SUSPEND", "BAN", "ARCHIVE"]],
    ["ONBOARDING", ["BAN", "ARCHIVE"]],
  ] as const)(
    "excludes only the action that leads back to the current status for %s",
    (status, expected) => {
      expect(getAvailableModerationActions(status)).toEqual(expected);
    },
  );

  it.each([
    ["PENDING_REVIEW", false],
    ["CHANGES_REQUESTED", false],
    ["SUSPENDED", true],
    ["BANNED", true],
  ] as const)(
    "requires a reason to approve from %s only when it reverses a ban or suspension",
    (status, expected) => {
      expect(moderationApproveRequiresReason(status)).toBe(expected);
    },
  );
});
