import "server-only";

import { randomUUID } from "node:crypto";

const requestIdLabelPattern = /^[a-z][a-z0-9._:-]{0,63}$/iu;
const requestIdUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const jwtPattern = /^[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/iu;
const sensitiveWordPattern =
  /(?:bearer|password|secret|smtp|token|whatsapp|cnpj)/iu;

export function isSafeRequestId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const requestId = value.trim();

  return (
    requestId.length > 0 &&
    requestId.length <= 64 &&
    (requestIdUuidPattern.test(requestId) ||
      requestIdLabelPattern.test(requestId)) &&
    !jwtPattern.test(requestId) &&
    !sensitiveWordPattern.test(requestId)
  );
}

export function resolveRequestId(
  headers: Pick<Headers, "get">,
  fallback: () => string = randomUUID,
) {
  const requestedId = headers.get("x-request-id");

  if (isSafeRequestId(requestedId)) {
    return requestedId.trim();
  }

  const fallbackId = fallback();
  return isSafeRequestId(fallbackId) ? fallbackId.trim() : randomUUID();
}

export function requestIdResponseHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-request-id": requestId,
  };
}
