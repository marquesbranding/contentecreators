import { describe, expect, it } from "vitest";

import {
  evaluateModerationCommand,
  type AccountStatus,
  type ModerationAction,
  type ModerationCommand,
} from "./moderation-policy";

const ownerAccountId = "10000000-0000-4000-8000-000000000001";
const adminAccountId = "a0000000-0000-4000-8000-000000000001";
const statuses: AccountStatus[] = [
  "ONBOARDING",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
];

const allowedTransitions = new Map<
  string,
  { action: ModerationAction; actor: "ADMIN" | "OWNER"; reason?: string }
>([
  ["ONBOARDING>PENDING_REVIEW", { action: "SUBMIT", actor: "OWNER" }],
  [
    "PENDING_REVIEW>CHANGES_REQUESTED",
    {
      action: "REQUEST_CHANGES",
      actor: "ADMIN",
      reason: "Atualize os dados indicados.",
    },
  ],
  ["PENDING_REVIEW>APPROVED", { action: "APPROVE", actor: "ADMIN" }],
  [
    "PENDING_REVIEW>BANNED",
    {
      action: "BAN",
      actor: "ADMIN",
      reason: "Identidade incompatível com a plataforma.",
    },
  ],
  ["CHANGES_REQUESTED>PENDING_REVIEW", { action: "RESUBMIT", actor: "OWNER" }],
  [
    "CHANGES_REQUESTED>BANNED",
    {
      action: "BAN",
      actor: "ADMIN",
      reason: "Tentativa de contornar a análise.",
    },
  ],
  [
    "APPROVED>SUSPENDED",
    {
      action: "SUSPEND",
      actor: "ADMIN",
      reason: "Análise operacional necessária.",
    },
  ],
  [
    "APPROVED>BANNED",
    {
      action: "BAN",
      actor: "ADMIN",
      reason: "Violação confirmada dos termos.",
    },
  ],
  [
    "SUSPENDED>APPROVED",
    {
      action: "RESTORE",
      actor: "ADMIN",
      reason: "Revisão concluída e acesso restabelecido.",
    },
  ],
  [
    "SUSPENDED>BANNED",
    {
      action: "BAN",
      actor: "ADMIN",
      reason: "Violação confirmada durante a revisão.",
    },
  ],
]);

function command(
  overrides: Partial<ModerationCommand> = {},
): ModerationCommand {
  return {
    action: "APPROVE",
    actorAccountId: adminAccountId,
    actorRole: "ADMIN",
    currentAccountVersion: 3,
    currentProfileVersion: 5,
    currentStatus: "PENDING_REVIEW",
    expectedAccountVersion: 3,
    expectedProfileVersion: 5,
    idempotencyKey: "moderation-command:test",
    ownerAccountId,
    targetStatus: "APPROVED",
    ...overrides,
  };
}

describe("evaluateModerationCommand", () => {
  it("accepts every defined standard state transition with its exact action and actor", () => {
    for (const [transition, definition] of allowedTransitions) {
      const [currentStatus, targetStatus] = transition.split(">") as [
        AccountStatus,
        AccountStatus,
      ];
      const ownerCommand = definition.actor === "OWNER";

      expect(
        evaluateModerationCommand(
          command({
            action: definition.action,
            actorAccountId: ownerCommand ? ownerAccountId : adminAccountId,
            actorRole: ownerCommand ? "INFLUENCER" : "ADMIN",
            currentStatus,
            reason: definition.reason,
            targetStatus,
          }),
        ),
      ).toEqual({
        kind: "allowed",
        normalizedReason: definition.reason ?? null,
      });
    }
  });

  it("rejects every undefined standard state pair", () => {
    for (const currentStatus of statuses) {
      for (const targetStatus of statuses) {
        const transition = `${currentStatus}>${targetStatus}`;

        if (allowedTransitions.has(transition)) {
          continue;
        }

        expect(
          evaluateModerationCommand(
            command({
              currentStatus,
              targetStatus,
            }),
          ),
          transition,
        ).toMatchObject({
          code: "INVALID_TRANSITION",
          kind: "rejected",
        });
      }
    }
  });

  it.each([
    ["REQUEST_CHANGES", "PENDING_REVIEW", "CHANGES_REQUESTED"],
    ["SUSPEND", "APPROVED", "SUSPENDED"],
    ["RESTORE", "SUSPENDED", "APPROVED"],
    ["BAN", "APPROVED", "BANNED"],
    ["UNBAN", "BANNED", "APPROVED"],
    ["ARCHIVE", "APPROVED", "APPROVED"],
  ] as const)(
    "requires a meaningful reason for %s",
    (action, currentStatus, targetStatus) => {
      expect(
        evaluateModerationCommand(
          command({
            action,
            currentStatus,
            lastStatusBeforeBan: action === "UNBAN" ? "APPROVED" : undefined,
            reason: "  ",
            targetStatus,
          }),
        ),
      ).toMatchObject({
        code: "REASON_REQUIRED",
        kind: "rejected",
      });
    },
  );

  it("authorizes owner submissions and denies cross-account or admin substitution", () => {
    const submission = command({
      action: "SUBMIT",
      actorAccountId: ownerAccountId,
      actorRole: "COMPANY",
      currentStatus: "ONBOARDING",
      targetStatus: "PENDING_REVIEW",
    });

    expect(evaluateModerationCommand(submission)).toMatchObject({
      kind: "allowed",
    });
    expect(
      evaluateModerationCommand({
        ...submission,
        actorAccountId: "20000000-0000-4000-8000-000000000002",
      }),
    ).toMatchObject({
      code: "OWNER_REQUIRED",
      kind: "rejected",
    });
    expect(
      evaluateModerationCommand({
        ...submission,
        actorAccountId: adminAccountId,
        actorRole: "ADMIN",
      }),
    ).toMatchObject({
      code: "OWNER_REQUIRED",
      kind: "rejected",
    });
  });

  it("requires an administrator for moderation and archive commands", () => {
    for (const action of [
      "APPROVE",
      "REQUEST_CHANGES",
      "SUSPEND",
      "RESTORE",
      "BAN",
      "UNBAN",
      "ARCHIVE",
    ] as const) {
      const actionCommand =
        action === "ARCHIVE"
          ? command({
              action,
              actorAccountId: ownerAccountId,
              actorRole: "INFLUENCER",
              currentStatus: "APPROVED",
              reason: "Remoção solicitada.",
              targetStatus: "APPROVED",
            })
          : command({
              action,
              actorAccountId: ownerAccountId,
              actorRole: "INFLUENCER",
              reason: "Motivo administrativo válido.",
            });

      expect(evaluateModerationCommand(actionCommand), action).toMatchObject({
        code: "ADMIN_REQUIRED",
        kind: "rejected",
      });
    }
  });

  it("rejects stale account versions before allowing a transition", () => {
    expect(
      evaluateModerationCommand(
        command({
          currentAccountVersion: 4,
          expectedAccountVersion: 3,
        }),
      ),
    ).toMatchObject({
      code: "STALE_VERSION",
      kind: "rejected",
    });
  });

  it("requires a stable idempotency key on owner and admin commands", () => {
    expect(
      evaluateModerationCommand(
        command({
          idempotencyKey: " short ",
        }),
      ),
    ).toMatchObject({
      code: "IDEMPOTENCY_KEY_INVALID",
      kind: "rejected",
    });
  });

  it("requires and compares the profile version when resubmitting corrections", () => {
    const resubmission = command({
      action: "RESUBMIT",
      actorAccountId: ownerAccountId,
      actorRole: "INFLUENCER",
      currentStatus: "CHANGES_REQUESTED",
      targetStatus: "PENDING_REVIEW",
    });

    expect(
      evaluateModerationCommand({
        ...resubmission,
        currentProfileVersion: undefined,
      }),
    ).toMatchObject({
      code: "PROFILE_VERSION_REQUIRED",
      kind: "rejected",
    });
    expect(
      evaluateModerationCommand({
        ...resubmission,
        currentProfileVersion: 6,
        expectedProfileVersion: 5,
      }),
    ).toMatchObject({
      code: "STALE_PROFILE_VERSION",
      kind: "rejected",
    });
  });

  it("keeps banned accounts terminal for owners and restores only the pre-ban state", () => {
    expect(
      evaluateModerationCommand(
        command({
          action: "RESUBMIT",
          actorAccountId: ownerAccountId,
          actorRole: "INFLUENCER",
          currentStatus: "BANNED",
          targetStatus: "PENDING_REVIEW",
        }),
      ),
    ).toMatchObject({
      code: "INVALID_TRANSITION",
      kind: "rejected",
    });

    const exceptionalUnban = command({
      action: "UNBAN",
      currentStatus: "BANNED",
      lastStatusBeforeBan: "CHANGES_REQUESTED",
      reason: "Banimento aplicado à conta incorreta.",
      targetStatus: "CHANGES_REQUESTED",
    });

    expect(evaluateModerationCommand(exceptionalUnban)).toEqual({
      kind: "allowed",
      normalizedReason: "Banimento aplicado à conta incorreta.",
    });
    expect(
      evaluateModerationCommand({
        ...exceptionalUnban,
        targetStatus: "APPROVED",
      }),
    ).toMatchObject({
      code: "INVALID_UNBAN_TARGET",
      kind: "rejected",
    });
  });

  it("allows an admin to archive without fabricating a status transition", () => {
    expect(
      evaluateModerationCommand(
        command({
          action: "ARCHIVE",
          currentStatus: "CHANGES_REQUESTED",
          reason: "Cadastro removido da operação a pedido do cliente.",
          targetStatus: "CHANGES_REQUESTED",
        }),
      ),
    ).toEqual({
      kind: "allowed",
      normalizedReason: "Cadastro removido da operação a pedido do cliente.",
    });
  });
});
