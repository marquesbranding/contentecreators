import { z } from "zod";

import { createEnvironmentError } from "./env-error";

const stringBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const localAdminEmails = z
  .string()
  .optional()
  .default("")
  .transform((value) => [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(z.email()).max(20));

const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["local", "development", "production"]),
    CRON_SECRET: z.string().min(32),
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    LOCAL_ADMIN_EMAILS: localAdminEmails,
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    PUBLIC_SOCIAL_PROOF_ENABLED: z.literal("false").transform(() => false),
    SMTP_FROM_EMAIL: z.email(),
    SMTP_FROM_NAME: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
    SMTP_SECURE: stringBoolean,
    SMTP_USER: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .superRefine((environment, context) => {
    if (
      environment.APP_ENV !== "local" &&
      environment.LOCAL_ADMIN_EMAILS.length > 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Local administrator emails are local-only.",
        path: ["LOCAL_ADMIN_EMAILS"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    throw createEnvironmentError("server", result.error);
  }

  return result.data;
}
