/**
 * Deletion is immediate and permanent (client decision, review 04). The legal
 * deadline only matters for legacy accounts left in REQUESTED/FAILED by the
 * previous 30-day flow, which the daily routine still watches.
 */
export const ELIMINATION_DEADLINE_DAYS = 120;
export const DEADLINE_ALERT_DAYS = 15;
export const DELETION_CONFIRMATION_PHRASE = "EXCLUIR";

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the legal deadline is within the alert window (or already past). */
export function isDeadlineNear(dueAt: Date | string, now: Date): boolean {
  return (
    new Date(dueAt).getTime() - now.getTime() <= DEADLINE_ALERT_DAYS * DAY_MS
  );
}

export function isDeletionPhrase(value: string): boolean {
  return value.trim().toUpperCase() === DELETION_CONFIRMATION_PHRASE;
}
