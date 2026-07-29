import { redactAuditSnapshot, toSafeAuditRevision } from "./audit-redaction";
import { getAuditValueLabel } from "./audit-history-presentation";
import type {
  AuditDisplayValue,
  AuditHistoryItemDto,
} from "../types/audit-history.types";
import type { AuditRevisionInput } from "../types/audit-types";

const protectedText = "[DADO PROTEGIDO]";
const emailPattern = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/giu;
const cnpjPattern = /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}-?\d{2}\b/gu;
const phonePattern =
  /(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}(?!\d)/gu;
const bearerPattern = /\bbearer\s+[a-z0-9._~+/=-]+\b/giu;
const tokenQueryPattern =
  /([?&](?:token|access_token|refresh_token|signature)=)[^&\s]+/giu;

function redactFreeText(value: string) {
  return value
    .replace(emailPattern, protectedText)
    .replace(cnpjPattern, protectedText)
    .replace(phonePattern, protectedText)
    .replace(bearerPattern, protectedText)
    .replace(tokenQueryPattern, `$1${encodeURIComponent(protectedText)}`);
}

function toDisplayValue(value: unknown): AuditDisplayValue {
  if (value === undefined) {
    return null;
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return getAuditValueLabel(redactFreeText(value));
  }

  if (Array.isArray(value)) {
    return value.map(toDisplayValue);
  }

  if (typeof value === "object") {
    const redacted = redactAuditSnapshot(value as Record<string, unknown>);

    return Object.fromEntries(
      Object.entries(redacted).map(([key, nested]) => [
        key,
        toDisplayValue(nested),
      ]),
    );
  }

  return String(value);
}

export function toAuditHistoryItem(
  revision: AuditRevisionInput,
): AuditHistoryItemDto {
  const safeRevision = toSafeAuditRevision(revision);

  return {
    action: safeRevision.operation,
    actor: safeRevision.actor,
    changes: Object.entries(safeRevision.changes).map(
      ([field, { after, before }]) => ({
        after: toDisplayValue(after),
        before: toDisplayValue(before),
        field,
      }),
    ),
    entity: safeRevision.entityTable,
    occurredAt: safeRevision.occurredAt,
    reason: safeRevision.reason
      ? redactFreeText(safeRevision.reason).slice(0, 2_000)
      : null,
    record: safeRevision.entityId,
    requestId: safeRevision.requestId,
    revision: safeRevision.revision,
    source: safeRevision.source,
  };
}
