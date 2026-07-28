import { describe, expect, it } from "vitest";

import {
  getAvailableModerationActions,
  getModerationRoleLabel,
  getModerationStatusLabel,
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

  it("offers only individual decisions allowed for a pending submission", () => {
    expect(getAvailableModerationActions("PENDING_REVIEW")).toEqual([
      "APPROVE",
      "REQUEST_CHANGES",
      "BAN",
      "ARCHIVE",
    ]);
  });

  it.each([
    ["APPROVED", ["SUSPEND", "BAN", "ARCHIVE"]],
    ["SUSPENDED", ["RESTORE", "BAN", "ARCHIVE"]],
    ["BANNED", ["UNBAN", "ARCHIVE"]],
    ["CHANGES_REQUESTED", ["BAN", "ARCHIVE"]],
    ["ONBOARDING", ["ARCHIVE"]],
  ] as const)("limits actions for %s", (status, expected) => {
    expect(getAvailableModerationActions(status)).toEqual(expected);
  });
});
