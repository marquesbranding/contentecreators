export type AccountStatus =
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUSPENDED"
  | "BANNED";

export type ModerationAction =
  | "SUBMIT"
  | "REQUEST_CHANGES"
  | "RESUBMIT"
  | "APPROVE"
  | "SUSPEND"
  | "RESTORE"
  | "BAN"
  | "UNBAN"
  | "ARCHIVE";

export type ModerationActorRole = "ADMIN" | "INFLUENCER" | "COMPANY";

type RestorableStatus = Exclude<AccountStatus, "ONBOARDING" | "BANNED">;

export interface ModerationCommand {
  action: ModerationAction;
  actorAccountId: string;
  actorRole: ModerationActorRole;
  currentAccountVersion: number;
  currentProfileVersion?: number;
  currentStatus: AccountStatus;
  expectedAccountVersion: number;
  expectedProfileVersion?: number;
  idempotencyKey: string;
  lastStatusBeforeBan?: RestorableStatus;
  ownerAccountId: string;
  reason?: string | null;
  targetStatus: AccountStatus;
}

export type ModerationRejectionCode =
  | "ADMIN_REQUIRED"
  | "IDEMPOTENCY_KEY_INVALID"
  | "INVALID_TRANSITION"
  | "INVALID_UNBAN_TARGET"
  | "INVALID_VERSION"
  | "OWNER_REQUIRED"
  | "PROFILE_VERSION_REQUIRED"
  | "REASON_REQUIRED"
  | "STALE_PROFILE_VERSION"
  | "STALE_VERSION";

export type ModerationCommandResult =
  | {
      kind: "allowed";
      normalizedReason: string | null;
    }
  | {
      code: ModerationRejectionCode;
      kind: "rejected";
    };

interface TransitionDefinition {
  action: ModerationAction;
  from: AccountStatus;
  to: AccountStatus;
}

const STANDARD_TRANSITIONS: readonly TransitionDefinition[] = [
  {
    action: "SUBMIT",
    from: "ONBOARDING",
    to: "PENDING_REVIEW",
  },
  {
    action: "APPROVE",
    from: "PENDING_REVIEW",
    to: "APPROVED",
  },
  {
    action: "REQUEST_CHANGES",
    from: "PENDING_REVIEW",
    to: "CHANGES_REQUESTED",
  },
  {
    action: "BAN",
    from: "PENDING_REVIEW",
    to: "BANNED",
  },
  {
    action: "RESUBMIT",
    from: "CHANGES_REQUESTED",
    to: "PENDING_REVIEW",
  },
  {
    action: "BAN",
    from: "CHANGES_REQUESTED",
    to: "BANNED",
  },
  {
    action: "SUSPEND",
    from: "APPROVED",
    to: "SUSPENDED",
  },
  {
    action: "BAN",
    from: "APPROVED",
    to: "BANNED",
  },
  {
    action: "RESTORE",
    from: "SUSPENDED",
    to: "APPROVED",
  },
  {
    action: "BAN",
    from: "SUSPENDED",
    to: "BANNED",
  },
] as const;

const OWNER_ACTIONS = new Set<ModerationAction>(["SUBMIT", "RESUBMIT"]);
const REASON_REQUIRED_ACTIONS = new Set<ModerationAction>([
  "REQUEST_CHANGES",
  "SUSPEND",
  "RESTORE",
  "BAN",
  "UNBAN",
  "ARCHIVE",
]);

function isPositiveVersion(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function authorizeActor(
  command: ModerationCommand,
): ModerationCommandResult | null {
  if (OWNER_ACTIONS.has(command.action)) {
    if (
      command.actorRole === "ADMIN" ||
      command.actorAccountId !== command.ownerAccountId
    ) {
      return {
        code: "OWNER_REQUIRED",
        kind: "rejected",
      };
    }

    return null;
  }

  if (command.actorRole !== "ADMIN") {
    return {
      code: "ADMIN_REQUIRED",
      kind: "rejected",
    };
  }

  return null;
}

function validateTransition(
  command: ModerationCommand,
): ModerationCommandResult | null {
  if (command.action === "ARCHIVE") {
    return command.currentStatus === command.targetStatus
      ? null
      : {
          code: "INVALID_TRANSITION",
          kind: "rejected",
        };
  }

  if (command.action === "UNBAN") {
    if (
      command.currentStatus !== "BANNED" ||
      !command.lastStatusBeforeBan ||
      command.targetStatus !== command.lastStatusBeforeBan
    ) {
      return {
        code: "INVALID_UNBAN_TARGET",
        kind: "rejected",
      };
    }

    return null;
  }

  const allowed = STANDARD_TRANSITIONS.some(
    (transition) =>
      transition.action === command.action &&
      transition.from === command.currentStatus &&
      transition.to === command.targetStatus,
  );

  return allowed
    ? null
    : {
        code: "INVALID_TRANSITION",
        kind: "rejected",
      };
}

export function evaluateModerationCommand(
  command: ModerationCommand,
): ModerationCommandResult {
  const normalizedIdempotencyKey = command.idempotencyKey.trim();
  if (
    normalizedIdempotencyKey.length < 8 ||
    normalizedIdempotencyKey.length > 160
  ) {
    return {
      code: "IDEMPOTENCY_KEY_INVALID",
      kind: "rejected",
    };
  }

  if (
    !isPositiveVersion(command.currentAccountVersion) ||
    !isPositiveVersion(command.expectedAccountVersion)
  ) {
    return {
      code: "INVALID_VERSION",
      kind: "rejected",
    };
  }

  if (command.action === "RESUBMIT") {
    if (
      !isPositiveVersion(command.currentProfileVersion ?? 0) ||
      !isPositiveVersion(command.expectedProfileVersion ?? 0)
    ) {
      return {
        code: "PROFILE_VERSION_REQUIRED",
        kind: "rejected",
      };
    }

    if (command.currentProfileVersion !== command.expectedProfileVersion) {
      return {
        code: "STALE_PROFILE_VERSION",
        kind: "rejected",
      };
    }
  }

  if (command.currentAccountVersion !== command.expectedAccountVersion) {
    return {
      code: "STALE_VERSION",
      kind: "rejected",
    };
  }

  const actorRejection = authorizeActor(command);
  if (actorRejection) {
    return actorRejection;
  }

  const transitionRejection = validateTransition(command);
  if (transitionRejection) {
    return transitionRejection;
  }

  const normalizedReason = command.reason?.trim() || null;
  if (
    REASON_REQUIRED_ACTIONS.has(command.action) &&
    (!normalizedReason || normalizedReason.length < 3)
  ) {
    return {
      code: "REASON_REQUIRED",
      kind: "rejected",
    };
  }

  return {
    kind: "allowed",
    normalizedReason,
  };
}
