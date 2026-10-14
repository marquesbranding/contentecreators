import "server-only";

import {
  directoryCursorPayloadSchema,
  legacyDirectoryCursorPayloadSchema,
} from "../../schemas/catalog-directory.schema";
import type { DirectoryCursor } from "../../types/catalog-directory.types";

export class DirectoryCursorError extends Error {
  readonly code = "INVALID_CURSOR";

  constructor() {
    super("INVALID_CURSOR");
    this.name = "DirectoryCursorError";
  }
}

function encodeUtf8(value: string) {
  return String.fromCharCode(...new TextEncoder().encode(value));
}

function decodeUtf8(value: string) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(value), (character) => character.charCodeAt(0)),
  );
}

export function encodeDirectoryCursor(cursor: DirectoryCursor): string {
  const payload = directoryCursorPayloadSchema.parse(cursor);

  return btoa(encodeUtf8(JSON.stringify(payload)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

/**
 * Decodes an opaque cursor.
 *
 * - absent cursor, or a legacy v1 cursor (creation-date keyset, issued before
 *   the daily shuffle) → `null`, i.e. start from the first page of the current
 *   order. The legacy key space does not exist anymore, so it cannot be honoured.
 * - anything else that is not a valid v2 cursor → `DirectoryCursorError`.
 */
export function decodeDirectoryCursor(
  cursor: string | undefined,
): DirectoryCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const padding = "=".repeat((4 - (cursor.length % 4)) % 4);
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/") + padding;
    const payload: unknown = JSON.parse(decodeUtf8(base64));

    if (legacyDirectoryCursorPayloadSchema.safeParse(payload).success) {
      return null;
    }

    return directoryCursorPayloadSchema.parse(payload);
  } catch {
    throw new DirectoryCursorError();
  }
}
