/** Windows fixed by the Privacy Policy (chapters 8 and 9) and the approved plan. */
export const RECOVERY_WINDOW_DAYS = 30;
export const ELIMINATION_DEADLINE_DAYS = 120;
export const DEADLINE_ALERT_DAYS = 15;
export const RECENT_LOGIN_WINDOW_MS = 5 * 60 * 1000;
export const DELETION_CONFIRMATION_PHRASE = "EXCLUIR";

const DAY_MS = 24 * 60 * 60 * 1000;

export function isRecentLogin(
  lastSignInAt: string | null | undefined,
  now: Date,
): boolean {
  if (!lastSignInAt) {
    return false;
  }

  const signedInAt = Date.parse(lastSignInAt);

  return (
    !Number.isNaN(signedInAt) &&
    signedInAt <= now.getTime() &&
    now.getTime() - signedInAt <= RECENT_LOGIN_WINDOW_MS
  );
}

/** An account can be recovered only while its 30-day window is open. */
export function isRecoverable(
  account: {
    deletionState: "ELIMINATED" | "FAILED" | "REQUESTED" | null;
    eliminationEligibleAt: Date | string | null;
  },
  now: Date,
): boolean {
  if (account.deletionState !== "REQUESTED" || !account.eliminationEligibleAt) {
    return false;
  }

  return new Date(account.eliminationEligibleAt).getTime() > now.getTime();
}

/** True when the legal deadline is within the alert window (or already past). */
export function isDeadlineNear(dueAt: Date | string, now: Date): boolean {
  return (
    new Date(dueAt).getTime() - now.getTime() <= DEADLINE_ALERT_DAYS * DAY_MS
  );
}

export function isDeletionPhrase(value: string): boolean {
  return value.trim().toUpperCase() === DELETION_CONFIRMATION_PHRASE;
}
