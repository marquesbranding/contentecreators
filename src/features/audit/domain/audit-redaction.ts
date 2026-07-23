import type {
  AuditActor,
  AuditActorType,
  AuditRevisionInput,
  AuditRole,
  SafeAuditRevision,
} from "../types/audit-types";

const redactedValue = "[REDACTED]";
const sensitiveKeys = new Set([
  "access_token",
  "authorization",
  "cnpj",
  "email",
  "encrypted_password",
  "identity_key_hash",
  "network_key_hash",
  "object_path",
  "operational_email",
  "password",
  "payload",
  "provider_subject_hash",
  "raw_provider_response",
  "recipient_email",
  "recovery_token",
  "refresh_token",
  "service_role_key",
  "signed_url",
  "smtp_password",
  "smtp_secret",
  "supabase_service_role_key",
  "user_agent_hash",
  "whatsapp",
  "whatsapp_e164",
]);

function normalizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalizedKey = normalizeKey(key);

  return (
    sensitiveKeys.has(normalizedKey) ||
    normalizedKey.endsWith("_password") ||
    normalizedKey.endsWith("_secret") ||
    normalizedKey.endsWith("_token") ||
    normalizedKey.endsWith("_signed_url")
  );
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    return redactAuditSnapshot(value as Record<string, unknown>);
  }

  return value;
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableValue).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => `${key}:${stableValue(nestedValue)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export function redactAuditSnapshot(
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? redactedValue : redactValue(value),
    ]),
  );
}

export function calculateChangedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  return [...allKeys]
    .filter((key) => stableValue(before?.[key]) !== stableValue(after?.[key]))
    .sort();
}

export function mapAuditActor(input: {
  accountId: string | null;
  actorType: AuditActorType | null;
  role: AuditRole;
}): AuditActor {
  const actorRequiresAccount =
    input.actorType === "USER" || input.actorType === "ADMIN";
  const invalidRole =
    input.actorType === "ADMIN"
      ? input.role !== "ADMIN"
      : input.actorType === "USER" && input.role === "ADMIN";

  if (
    !input.actorType ||
    (actorRequiresAccount && !input.accountId) ||
    invalidRole
  ) {
    return {
      accountId: null,
      actorType: "SYSTEM_UNKNOWN",
      role: null,
    };
  }

  return {
    accountId: input.accountId,
    actorType: input.actorType,
    role: input.role,
  };
}

export function toSafeAuditRevision(
  revision: AuditRevisionInput,
): SafeAuditRevision {
  const redactedBefore = redactAuditSnapshot(revision.beforeState ?? {});
  const redactedAfter = redactAuditSnapshot(revision.afterState ?? {});
  const changes = Object.fromEntries(
    revision.changedFields.map((field) => [
      field,
      {
        before: redactedBefore[field],
        after: redactedAfter[field],
      },
    ]),
  );

  return {
    revision: revision.revision,
    entityTable: revision.entityTable,
    entityId: revision.entityId,
    operation: revision.operation,
    actor: mapAuditActor({
      accountId: revision.actorAccountId,
      actorType: revision.actorType,
      role: revision.actorRole,
    }),
    source: revision.source,
    requestId: revision.requestId,
    reason: revision.reason,
    changes,
    occurredAt: revision.occurredAt.toISOString(),
  };
}
