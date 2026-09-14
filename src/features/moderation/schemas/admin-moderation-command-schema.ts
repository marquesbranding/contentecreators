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

const requestedFieldSchema = z
  .object({
    field: z.string().trim().min(1).max(80),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminModerationCommandSchema = z
  .object({
    accountId: z.uuid(),
    action: adminModerationActionSchema,
    expectedAccountVersion: z.number().int().positive(),
    expectedProfileVersion: z.number().int().positive(),
    idempotencyKey: z.string().trim().min(8).max(160),
    reason: z.string().trim().max(2_000).nullable().optional(),
    requestedFields: z.array(requestedFieldSchema).max(50).default([]),
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

    if (
      command.action !== "REQUEST_CHANGES" &&
      command.requestedFields.length > 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Requested fields are only allowed with REQUEST_CHANGES.",
        path: ["requestedFields"],
      });
    }
  })
  .transform((command) => ({
    ...command,
    reason: command.reason?.trim() || null,
  }));

export type AdminModerationRequestedField = z.infer<
  typeof requestedFieldSchema
>;

export type AdminModerationAction = z.infer<typeof adminModerationActionSchema>;
export type AdminModerationCommand = z.infer<
  typeof adminModerationCommandSchema
>;
/** The pre-parse shape — `requestedFields` is optional here since the schema defaults it. */
export type AdminModerationCommandInput = z.input<
  typeof adminModerationCommandSchema
>;
