import { describe, expect, it } from "vitest";

import {
  adminModerationActionSchema,
  adminModerationCommandSchema,
} from "./admin-moderation-command-schema";

const validCommand = {
  accountId: "10000000-0000-4000-8000-000000000001",
  action: "APPROVE",
  expectedAccountVersion: 3,
  expectedProfileVersion: 2,
  idempotencyKey: "moderation:approve:account-1",
  reason: null,
  requestId: "request-account-1",
} as const;

describe("admin moderation command schema", () => {
  it("keeps beta moderation commands scoped to one account", () => {
    expect(adminModerationCommandSchema.parse(validCommand)).toEqual(
      validCommand,
    );
  });

  it.each(["BULK_APPROVE", "BULK_BAN"])(
    "rejects the unsupported bulk action %s",
    (action) => {
      expect(adminModerationActionSchema.safeParse(action)).toMatchObject({
        success: false,
      });
    },
  );

  it.each([
    ["REQUEST_CHANGES", ""],
    ["SUSPEND", "  "],
    ["RESTORE", "x"],
    ["BAN", null],
    ["UNBAN", undefined],
    ["ARCHIVE", "no"],
  ])("requires a human reason for %s", (action, reason) => {
    const result = adminModerationCommandSchema.safeParse({
      ...validCommand,
      action,
      reason,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["reason"],
        }),
      ]),
    );
  });

  it("allows approval without inventing a reason", () => {
    expect(adminModerationCommandSchema.parse(validCommand).reason).toBeNull();
  });
});
