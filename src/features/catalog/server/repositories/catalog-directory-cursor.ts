import "server-only";

import { directoryCursorPayloadSchema } from "../../schemas/catalog-directory.schema";
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

    return directoryCursorPayloadSchema.parse(payload);
  } catch {
    throw new DirectoryCursorError();
  }
}
