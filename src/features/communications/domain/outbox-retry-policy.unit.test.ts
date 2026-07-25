import { describe, expect, it } from "vitest";

import {
  calculateOutboxRetryAt,
  resolveOutboxFailureState,
  sanitizeOutboxMetadata,
} from "./outbox-retry-policy";

describe("outbox retry policy", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  it.each([
    { attemptNumber: 1, expectedDelayMs: 30_000 },
    { attemptNumber: 2, expectedDelayMs: 60_000 },
    { attemptNumber: 3, expectedDelayMs: 120_000 },
    { attemptNumber: 20, expectedDelayMs: 6 * 60 * 60 * 1_000 },
  ])(
    "applies bounded exponential backoff after attempt $attemptNumber",
    ({ attemptNumber, expectedDelayMs }) => {
      expect(calculateOutboxRetryAt({ attemptNumber, now }).getTime()).toBe(
        now.getTime() + expectedDelayMs,
      );
    },
  );

  it("moves exhausted and explicitly non-retryable failures to dead letter", () => {
    expect(
      resolveOutboxFailureState({
        attemptNumber: 4,
        maxAttempts: 5,
        retryable: true,
      }),
    ).toBe("FAILED");
    expect(
      resolveOutboxFailureState({
        attemptNumber: 5,
        maxAttempts: 5,
        retryable: true,
      }),
    ).toBe("DEAD_LETTER");
    expect(
      resolveOutboxFailureState({
        attemptNumber: 1,
        maxAttempts: 5,
        retryable: false,
      }),
    ).toBe("DEAD_LETTER");
  });

  it("keeps only bounded provider-safe metadata tokens", () => {
    expect(sanitizeOutboxMetadata("smtp_timeout", 24)).toBe("SMTP_TIMEOUT");
    expect(
      sanitizeOutboxMetadata(
        "smtp refused user@example.com / senha secreta",
        80,
      ),
    ).toBeNull();
    expect(sanitizeOutboxMetadata("A".repeat(81), 80)).toBeNull();
    expect(sanitizeOutboxMetadata("   ", 80)).toBeNull();
    expect(sanitizeOutboxMetadata(undefined, 80)).toBeNull();
  });
});
