import "server-only";

import { creatorCatalogCursorPayloadSchema } from "../../schemas/creator-catalog.schema";
import type { CreatorCatalogCursor } from "../../types/creator-catalog.types";

export class CreatorCatalogCursorError extends Error {
  readonly code = "INVALID_CURSOR";

  constructor() {
    super("INVALID_CURSOR");
    this.name = "CreatorCatalogCursorError";
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

export function encodeCreatorCatalogCursor(
  cursor: CreatorCatalogCursor,
): string {
  const payload = creatorCatalogCursorPayloadSchema.parse(cursor);

  return btoa(encodeUtf8(JSON.stringify(payload)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function decodeCreatorCatalogCursor(
  cursor: string | undefined,
): CreatorCatalogCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const padding = "=".repeat((4 - (cursor.length % 4)) % 4);
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/") + padding;
    const payload: unknown = JSON.parse(decodeUtf8(base64));

    return creatorCatalogCursorPayloadSchema.parse(payload);
  } catch {
    throw new CreatorCatalogCursorError();
  }
}
