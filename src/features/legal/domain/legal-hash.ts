import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

/** SHA-256 (hex) of the key-sorted JSON form of any plain content value. */
export function hashLegalContent(content: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(content)))
    .digest("hex");
}

/** SHA-256 (hex) of a published file's raw bytes. */
export function hashLegalFile(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
