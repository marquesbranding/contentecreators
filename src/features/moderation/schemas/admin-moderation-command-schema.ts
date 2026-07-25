import { z } from "zod";

export const adminModerationActionSchema = z.enum([
  "APPROVE",
  "REQUEST_CHANGES",
  "SUSPEND",
  "RESTORE",
  "BAN",
  "UNBAN",
  "ARCHIVE",
]);

const reasonRequiredActions = new Set([
  "REQUEST_CHANGES",
  "SUSPEND",
  "RESTORE",
  "BAN",
  "UNBAN",
  "ARCHIVE",
]);

export const adminModerationCommandSchema = z
  .object({
    accountId: z.uuid(),
    action: adminModerationActionSchema,
    expectedAccountVersion: z.number().int().positive(),
    expectedProfileVersion: z.number().int().positive(),
    idempotencyKey: z.string().trim().min(8).max(160),
    reason: z.string().trim().max(2_000).nullable().optional(),
    requestId: z.string().trim().min(8).max(128),
  })
  .superRefine((command, context) => {
    if (
      reasonRequiredActions.has(command.action) &&
      (!command.reason || command.reason.trim().length < 3)
    ) {
      context.addIssue({
        code: "custom",
        message: "A moderation reason is required.",
        path: ["reason"],
      });
    }
  })
  .transform((command) => ({
    ...command,
    reason: command.reason?.trim() || null,
  }));

export type AdminModerationAction = z.infer<typeof adminModerationActionSchema>;
export type AdminModerationCommand = z.infer<
  typeof adminModerationCommandSchema
>;
