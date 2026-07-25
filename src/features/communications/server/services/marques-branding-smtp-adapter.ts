import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { createTransport as createNodemailerTransport } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";

const LOCAL_SMTP_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const smtpConfigSchema = z
  .object({
    connectionTimeoutMs: z
      .number()
      .int()
      .min(1_000)
      .max(60_000)
      .default(10_000),
    fromEmail: z.email(),
    fromName: z.string().trim().min(1).max(120).refine(hasNoLineBreak),
    greetingTimeoutMs: z.number().int().min(1_000).max(60_000).default(10_000),
    host: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9.:[\]-]+$/),
    password: z.string().min(1).max(1_024),
    port: z.number().int().min(1).max(65_535),
    secure: z.boolean(),
    socketTimeoutMs: z.number().int().min(1_000).max(120_000).default(30_000),
    user: z.string().trim().min(1).max(320).refine(hasNoLineBreak),
  })
  .strict()
  .superRefine((config, context) => {
    const usesImplicitTlsPort = config.port === 465;

    if (config.secure !== usesImplicitTlsPort) {
      context.addIssue({
        code: "custom",
        message: "secure must be true only for implicit TLS on SMTP port 465.",
        path: ["secure"],
      });
    }
  });

const smtpMessageSchema = z
  .object({
    html: z.string().min(1).max(200_000),
    subject: z.string().trim().min(1).max(180).refine(hasNoLineBreak),
    text: z.string().min(1).max(100_000),
    to: z.email(),
  })
  .strict();

export interface MarquesBrandingSmtpConfig {
  connectionTimeoutMs?: number;
  fromEmail: string;
  fromName: string;
  greetingTimeoutMs?: number;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  socketTimeoutMs?: number;
  user: string;
}

export interface SmtpMessage {
  html: string;
  subject: string;
  text: string;
  to: string;
}

export type SmtpFailureCategory =
  "AUTHENTICATION" | "CONNECTION" | "RECIPIENT" | "TIMEOUT" | "TLS" | "UNKNOWN";

export interface SmtpDeliveryReceipt {
  kind: "sent";
  providerMessageIdHash?: string;
  responseCode?: string;
}

interface SmtpDeliveryInfo {
  accepted?: unknown[];
  messageId?: string;
  rejected?: unknown[];
  response?: string;
}

interface SmtpTransport {
  sendMail(message: Mail.Options): Promise<SmtpDeliveryInfo>;
}

interface SmtpAdapterDependencies {
  createTransport?: (options: SMTPTransport.Options) => SmtpTransport;
  transport?: SmtpTransport;
}

export class MarquesBrandingSmtpError extends Error {
  readonly category: SmtpFailureCategory;
  readonly code: string;
  readonly retryable: boolean;

  constructor(input: {
    category: SmtpFailureCategory;
    code: string;
    retryable: boolean;
  }) {
    super("SMTP delivery failed.");
    this.name = "MarquesBrandingSmtpError";
    this.category = input.category;
    this.code = input.code;
    this.retryable = input.retryable;
  }
}

export function createMarquesBrandingSmtpAdapter(
  input: MarquesBrandingSmtpConfig,
  dependencies: SmtpAdapterDependencies = {},
) {
  const config = parseSmtpConfig(input);
  const transport =
    dependencies.transport ??
    (dependencies.createTransport ?? createDefaultTransport)(
      createTransportOptions(config),
    );

  return {
    async send(messageInput: SmtpMessage): Promise<SmtpDeliveryReceipt> {
      const message = parseSmtpMessage(messageInput);
      let info: SmtpDeliveryInfo;

      try {
        info = await transport.sendMail({
          from: {
            address: config.fromEmail,
            name: config.fromName,
          },
          html: message.html,
          subject: message.subject,
          text: message.text,
          to: message.to,
        });
      } catch (error) {
        if (error instanceof MarquesBrandingSmtpError) {
          throw error;
        }

        throw mapSmtpFailure(error);
      }

      if (!info.accepted || info.accepted.length === 0) {
        throw new MarquesBrandingSmtpError({
          category: "RECIPIENT",
          code: "ERECIPIENT",
          retryable: false,
        });
      }

      return {
        kind: "sent",
        ...(info.messageId
          ? { providerMessageIdHash: hashMessageId(info.messageId) }
          : {}),
        ...(extractResponseCode(info.response)
          ? { responseCode: extractResponseCode(info.response) }
          : {}),
      };
    },
  };
}

function parseSmtpConfig(input: MarquesBrandingSmtpConfig) {
  const result = smtpConfigSchema.safeParse(input);

  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map((issue) => issue.path[0]).filter(Boolean),
      ),
    ].join(", ");
    throw new Error(
      `Invalid SMTP configuration${fields ? `: ${fields}` : "."}`,
    );
  }

  return result.data;
}

function parseSmtpMessage(input: SmtpMessage) {
  const result = smtpMessageSchema.safeParse(input);

  if (!result.success) {
    throw new Error("Invalid SMTP message.");
  }

  return result.data;
}

function createTransportOptions(
  config: ReturnType<typeof parseSmtpConfig>,
): SMTPTransport.Options {
  const isLocalCatcher = LOCAL_SMTP_HOSTS.has(config.host);
  const tlsServerName = isIP(config.host) === 0 ? config.host : undefined;

  return {
    auth: {
      pass: config.password,
      user: config.user,
    },
    connectionTimeout: config.connectionTimeoutMs,
    disableFileAccess: true,
    disableUrlAccess: true,
    greetingTimeout: config.greetingTimeoutMs,
    host: config.host,
    port: config.port,
    requireTLS: !config.secure && !isLocalCatcher,
    secure: config.secure,
    socketTimeout: config.socketTimeoutMs,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      ...(tlsServerName ? { servername: tlsServerName } : {}),
    },
  };
}

function createDefaultTransport(options: SMTPTransport.Options): SmtpTransport {
  return createNodemailerTransport(options);
}

function mapSmtpFailure(error: unknown): MarquesBrandingSmtpError {
  const code = extractSafeErrorCode(error);
  const category = mapFailureCategory(code);

  return new MarquesBrandingSmtpError({
    category,
    code,
    retryable: category !== "AUTHENTICATION" && category !== "RECIPIENT",
  });
}

function extractSafeErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z][A-Z0-9_]{0,39}$/.test(error.code)
  ) {
    return error.code;
  }

  return "EUNKNOWN";
}

function mapFailureCategory(code: string): SmtpFailureCategory {
  const categories: Record<string, SmtpFailureCategory> = {
    EAUTH: "AUTHENTICATION",
    ECONNECTION: "CONNECTION",
    EENVELOPE: "RECIPIENT",
    ETIMEDOUT: "TIMEOUT",
    ETLS: "TLS",
  };

  return categories[code] ?? "UNKNOWN";
}

function hashMessageId(messageId: string): string {
  return createHash("sha256").update(messageId).digest("hex");
}

function extractResponseCode(response: string | undefined): string | undefined {
  return response?.match(/(?:^|\s)([245]\d{2})(?:\s|$)/)?.[1];
}

function hasNoLineBreak(value: string): boolean {
  return !/[\r\n]/.test(value);
}
