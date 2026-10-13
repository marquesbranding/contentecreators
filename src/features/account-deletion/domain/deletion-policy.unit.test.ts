import { describe, expect, it } from "vitest";

import {
  isDeadlineNear,
  isDeletionPhrase,
  isRecentLogin,
  isRecoverable,
} from "./deletion-policy";

const now = new Date("2026-10-14T12:00:00Z");

describe("deletion policy", () => {
  it("accepts a login from the last five minutes only", () => {
    expect(isRecentLogin("2026-10-14T11:57:00Z", now)).toBe(true);
    expect(isRecentLogin("2026-10-14T11:50:00Z", now)).toBe(false);
    expect(isRecentLogin("2026-10-14T12:30:00Z", now)).toBe(false);
    expect(isRecentLogin(null, now)).toBe(false);
    expect(isRecentLogin("not a date", now)).toBe(false);
  });

  it("allows recovery only while the 30-day window is open", () => {
    expect(
      isRecoverable(
        {
          deletionState: "REQUESTED",
          eliminationEligibleAt: "2026-10-20T00:00:00Z",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isRecoverable(
        {
          deletionState: "REQUESTED",
          eliminationEligibleAt: "2026-10-14T12:00:00Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isRecoverable(
        {
          deletionState: "FAILED",
          eliminationEligibleAt: "2026-10-20T00:00:00Z",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isRecoverable({ deletionState: null, eliminationEligibleAt: null }, now),
    ).toBe(false);
  });

  it("flags accounts 15 days or less from the legal deadline", () => {
    expect(isDeadlineNear("2026-10-29T12:00:00Z", now)).toBe(true);
    expect(isDeadlineNear("2026-10-30T12:00:00Z", now)).toBe(false);
    expect(isDeadlineNear("2026-10-01T00:00:00Z", now)).toBe(true);
  });

  it("matches the confirmation phrase regardless of case and spacing", () => {
    expect(isDeletionPhrase(" excluir ")).toBe(true);
    expect(isDeletionPhrase("EXCLUIR")).toBe(true);
    expect(isDeletionPhrase("apagar")).toBe(false);
  });
});
