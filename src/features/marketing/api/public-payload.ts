/**
 * Validation primitives shared by the landing's public parsers. Every public
 * payload is parsed against a strict allowlist: an undeclared key rejects the
 * whole record, so a server change cannot leak a new field by accident.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

export function parseText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

export function parseOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  return value === null ? null : parseText(value, maxLength);
}

export function parseNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

const allowedSignedImageKeys = new Set(["height", "url", "width"]);

/**
 * Signed image URLs must share the configured Supabase project's exact
 * origin. That pins scheme, host and port in one comparison — hosted
 * deployments configure an HTTPS Supabase URL (enforced in
 * `hosted-deployment-target.ts`), so requiring `https:` separately would only
 * break local development, where Supabase serves plain HTTP. Anything
 * off-origin is a URL this client did not ask for, and the card falls back to
 * its placeholder mark rather than loading it.
 */
export function parseSignedImage(
  value: unknown,
): { height: number | null; url: string; width: number | null } | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, allowedSignedImageKeys) ||
    typeof value.url !== "string"
  ) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(value.url);

    if (url.origin !== new URL(supabaseUrl).origin) {
      return null;
    }

    return {
      height: parseNumber(value.height),
      url: url.toString(),
      width: parseNumber(value.width),
    };
  } catch {
    return null;
  }
}
