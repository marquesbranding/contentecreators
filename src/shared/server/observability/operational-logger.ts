import "server-only";

import { isSafeRequestId } from "./request-id";

const REDACTED_VALUE = "[REDACTED]";
const INVALID_REQUEST_ID = "[INVALID_REQUEST_ID]";
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 8;
const MAX_OBJECT_FIELDS = 40;
const MAX_TEXT_LENGTH = 500;

const emailPattern = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/giu;
const cnpjPattern =
  /(?<!\d)(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}-?\d{2})(?!\d)/gu;
const phonePattern =
  /(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)\d{4,5}[\s.-]?\d{4}(?!\d)/gu;
const bearerPattern = /\bbearer\s+[a-z0-9._~+/=-]+\b/giu;
const jwtPattern = /\b[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/giu;
const signedUrlPattern =
  /https?:\/\/[^\s]+(?:[?&](?:access_token|signature|sig|token)=)[^\s]*/giu;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type SensitiveDataCategory =
  | "CNPJ"
  | "EMAIL"
  | "PHONE"
  | "PROVIDER_PAYLOAD"
  | "SIGNED_URL"
  | "SMTP_SECRET"
  | "TOKEN";

export interface SensitiveDataLeak {
  category: SensitiveDataCategory;
  path: string;
}

export type OperationalEventName =
  | "auth_result"
  | "authorization_denied"
  | "ban_transition"
  | "banned_identity_attempt"
  | "company_registry_lookup"
  | "email_delivery_failure"
  | "health_check"
  | "migration_result"
  | "moderation_transition";

export interface OperationalLogInput {
  accountStatus?: string;
  actorRole?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
  errorCategory?: string;
  event: OperationalEventName;
  operation: string;
  outcome: string;
  provider?: string;
  requestId: string;
}

export interface OperationalLogEntry extends OperationalLogInput {
  level: "error" | "info" | "warn";
  timestamp: string;
}

type OperationalLogSink = (
  level: OperationalLogEntry["level"],
  event: OperationalLogEntry,
) => void;

function normalizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function categoryForSensitiveKey(
  key: string,
): SensitiveDataCategory | undefined {
  const normalized = normalizeKey(key);

  if (
    normalized === "raw_provider_payload" ||
    normalized === "raw_provider_response" ||
    normalized === "provider_payload" ||
    normalized === "payload"
  ) {
    return "PROVIDER_PAYLOAD";
  }

  if (normalized.includes("signed_url")) {
    return "SIGNED_URL";
  }

  if (normalized.includes("smtp")) {
    return "SMTP_SECRET";
  }

  if (normalized.includes("whatsapp") || normalized.includes("phone")) {
    return "PHONE";
  }

  if (normalized.includes("cnpj")) {
    return "CNPJ";
  }

  if (normalized.includes("email")) {
    return "EMAIL";
  }

  if (
    normalized.includes("authorization") ||
    normalized.includes("cookie") ||
    normalized.includes("credential") ||
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.endsWith("_token") ||
    normalized === "token"
  ) {
    return "TOKEN";
  }

  return undefined;
}

function redactText(value: string) {
  return value
    .slice(0, MAX_TEXT_LENGTH)
    .replace(signedUrlPattern, REDACTED_VALUE)
    .replace(emailPattern, REDACTED_VALUE)
    .replace(cnpjPattern, REDACTED_VALUE)
    .replace(phonePattern, REDACTED_VALUE)
    .replace(bearerPattern, REDACTED_VALUE)
    .replace(jwtPattern, REDACTED_VALUE);
}

function sanitizeNestedValue(value: unknown, depth: number): unknown {
  if (depth >= MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeNestedValue(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_FIELDS)
        .map(([key, nestedValue]) => [
          key,
          categoryForSensitiveKey(key)
            ? REDACTED_VALUE
            : sanitizeNestedValue(nestedValue, depth + 1),
        ]),
    );
  }

  return String(value).slice(0, MAX_TEXT_LENGTH);
}

export function sanitizeLogValue(value: unknown) {
  return sanitizeNestedValue(value, 0);
}

function addStringLeaks(
  value: string,
  path: string,
  leaks: SensitiveDataLeak[],
) {
  if (uuidPattern.test(value)) {
    return;
  }

  const patterns: ReadonlyArray<readonly [SensitiveDataCategory, RegExp]> = [
    ["SIGNED_URL", signedUrlPattern],
    ["EMAIL", emailPattern],
    ["CNPJ", cnpjPattern],
    ["PHONE", phonePattern],
    ["TOKEN", bearerPattern],
    ["TOKEN", jwtPattern],
  ];

  for (const [category, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      leaks.push({ category, path });
    }
  }
}

function scanValue(value: unknown, path: string, leaks: SensitiveDataLeak[]) {
  if (typeof value === "string") {
    if (value !== REDACTED_VALUE) {
      addStringLeaks(value, path, leaks);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, leaks));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const nestedPath = path ? `${path}.${key}` : key;
    const category = categoryForSensitiveKey(key);

    if (category && nestedValue !== REDACTED_VALUE) {
      leaks.push({ category, path: nestedPath });
      continue;
    }

    scanValue(nestedValue, nestedPath, leaks);
  }
}

export function findSensitiveDataLeaks(value: unknown) {
  const leaks: SensitiveDataLeak[] = [];
  scanValue(value, "", leaks);
  return leaks;
}

function defaultSink(
  level: OperationalLogEntry["level"],
  event: OperationalLogEntry,
) {
  if (level === "error") {
    console.error(event);
  } else if (level === "warn") {
    console.warn(event);
  } else {
    console.info(event);
  }
}

export function createOperationalLogger({
  now = () => new Date(),
  sink = defaultSink,
}: {
  now?: () => Date;
  sink?: OperationalLogSink;
} = {}) {
  function emit(
    level: OperationalLogEntry["level"],
    input: OperationalLogInput,
  ) {
    const safeDetails = input.details
      ? (sanitizeLogValue(input.details) as Record<string, unknown>)
      : undefined;
    const entry: OperationalLogEntry = {
      accountStatus: input.accountStatus
        ? redactText(input.accountStatus)
        : undefined,
      actorRole: input.actorRole ? redactText(input.actorRole) : undefined,
      details: safeDetails,
      durationMs:
        typeof input.durationMs === "number" &&
        Number.isFinite(input.durationMs)
          ? Math.max(0, Math.round(input.durationMs))
          : undefined,
      errorCategory: input.errorCategory
        ? redactText(input.errorCategory)
        : undefined,
      event: input.event,
      level,
      operation: redactText(input.operation),
      outcome: redactText(input.outcome),
      provider: input.provider ? redactText(input.provider) : undefined,
      requestId: isSafeRequestId(input.requestId)
        ? input.requestId
        : INVALID_REQUEST_ID,
      timestamp: now().toISOString(),
    };

    sink(level, entry);
  }

  return {
    error(input: OperationalLogInput) {
      emit("error", input);
    },
    info(input: OperationalLogInput) {
      emit("info", input);
    },
    warn(input: OperationalLogInput) {
      emit("warn", input);
    },
  };
}

export const operationalLogger = createOperationalLogger();
