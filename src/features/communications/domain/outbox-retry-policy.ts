const DEFAULT_BASE_DELAY_MS = 30_000;
const DEFAULT_MAX_DELAY_MS = 6 * 60 * 60 * 1_000;

export interface OutboxRetryPolicy {
  baseDelayMs: number;
  maxDelayMs: number;
}

export const defaultOutboxRetryPolicy: OutboxRetryPolicy = {
  baseDelayMs: DEFAULT_BASE_DELAY_MS,
  maxDelayMs: DEFAULT_MAX_DELAY_MS,
};

export function calculateOutboxRetryAt(input: {
  attemptNumber: number;
  now: Date;
  policy?: OutboxRetryPolicy;
}) {
  const policy = input.policy ?? defaultOutboxRetryPolicy;
  const exponent = Math.min(Math.max(input.attemptNumber - 1, 0), 30);
  const delayMs = Math.min(
    policy.baseDelayMs * 2 ** exponent,
    policy.maxDelayMs,
  );

  return new Date(input.now.getTime() + delayMs);
}

export function resolveOutboxFailureState(input: {
  attemptNumber: number;
  maxAttempts: number;
  retryable: boolean;
}) {
  return input.retryable && input.attemptNumber < input.maxAttempts
    ? ("FAILED" as const)
    : ("DEAD_LETTER" as const);
}

export function sanitizeOutboxMetadata(
  value: string | undefined,
  maxLength: number,
) {
  if (!value) {
    return null;
  }

  const safeValue = value.trim();

  return safeValue.length <= maxLength && /^[a-zA-Z0-9_.:-]+$/.test(safeValue)
    ? safeValue.toUpperCase()
    : null;
}
