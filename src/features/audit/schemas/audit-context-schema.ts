import { z } from "zod";

const accountRoleSchema = z.enum(["ADMIN", "INFLUENCER", "COMPANY"]);
const auditSourceSchema = z.enum([
  "APPLICATION",
  "BACKOFFICE",
  "AUTH_HOOK",
  "CRON",
  "SCRIPT",
  "DATABASE",
]);

const userContextSchema = z
  .object({
    actorAccountId: z.uuid(),
    actorType: z.enum(["USER", "ADMIN"]),
    actorRole: accountRoleSchema,
    source: auditSourceSchema,
    requestId: z.string().trim().min(1).max(128),
    reason: z.string().trim().min(3).max(2000).nullable(),
  })
  .superRefine((context, refinement) => {
    const adminContextIsInvalid =
      context.actorType === "ADMIN" && context.actorRole !== "ADMIN";
    const userContextIsInvalid =
      context.actorType === "USER" && context.actorRole === "ADMIN";

    if (adminContextIsInvalid || userContextIsInvalid) {
      refinement.addIssue({
        code: "custom",
        message: "Audit actor type and role are inconsistent.",
        path: ["actorRole"],
      });
    }
  });

const systemContextSchema = z.object({
  actorAccountId: z.null(),
  actorType: z.literal("SYSTEM"),
  actorRole: z.null(),
  source: auditSourceSchema.exclude(["APPLICATION", "BACKOFFICE"]),
  requestId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(3).max(2000).nullable(),
});

export const auditContextSchema = z.union([
  userContextSchema,
  systemContextSchema,
]);

export type VerifiedAuditContext = z.infer<typeof auditContextSchema>;
