import { z } from "zod";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const appUrlSchema = z.string().transform((value, context) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "A URL da aplicação é inválida.",
    });
    return z.NEVER;
  }

  const isSecure = url.protocol === "https:";
  const isLocalHttp =
    url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  const isOriginOnly =
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === "";

  if ((!isSecure && !isLocalHttp) || !isOriginOnly) {
    context.addIssue({
      code: "custom",
      message: "A URL da aplicação não é segura.",
    });
    return z.NEVER;
  }

  return url.origin;
});

const reasonSchema = z
  .object({
    reason: z.string().trim().min(3).max(1_000),
  })
  .strict();

const emptyPayloadSchema = z.object({}).strict();

const transactionalEmailInputSchema = z.discriminatedUnion("template", [
  z.object({
    appUrl: appUrlSchema,
    payload: emptyPayloadSchema,
    template: z.literal("ONBOARDING_RECEIVED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: reasonSchema,
    template: z.literal("CHANGES_REQUESTED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: emptyPayloadSchema,
    template: z.literal("APPROVED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: reasonSchema,
    template: z.literal("SUSPENDED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: emptyPayloadSchema,
    template: z.literal("RESTORED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: reasonSchema,
    template: z.literal("BANNED"),
  }),
  z.object({
    appUrl: appUrlSchema,
    payload: emptyPayloadSchema,
    template: z.literal("ADMIN_PROVISIONED"),
  }),
]);

export type TransactionalEmailInput = z.input<
  typeof transactionalEmailInputSchema
>;
export type ParsedTransactionalEmailInput = z.output<
  typeof transactionalEmailInputSchema
>;
export type TransactionalEmailTemplate =
  ParsedTransactionalEmailInput["template"];

export function parseTransactionalEmailInput(
  input: unknown,
): ParsedTransactionalEmailInput {
  const result = transactionalEmailInputSchema.safeParse(input);

  if (!result.success) {
    throw new Error("Invalid transactional email contract.");
  }

  return result.data;
}
