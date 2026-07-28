import "server-only";

const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

type SameOriginResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "INVALID_ORIGIN"
        | "MISSING_HOST"
        | "MISSING_ORIGIN"
        | "ORIGIN_MISMATCH"
        | "PROTOCOL_MISMATCH";
    };

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function verifySameOriginRequest(request: Request): SameOriginResult {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return { allowed: true };
  }

  const rawOrigin = request.headers.get("origin")?.trim();

  if (!rawOrigin) {
    return { allowed: false, reason: "MISSING_ORIGIN" };
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return { allowed: false, reason: "INVALID_ORIGIN" };
  }

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    return { allowed: false, reason: "INVALID_ORIGIN" };
  }

  const forwardedHost = firstForwardedValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = forwardedHost ?? request.headers.get("host")?.trim() ?? null;

  if (!host) {
    return { allowed: false, reason: "MISSING_HOST" };
  }

  if (origin.host.toLowerCase() !== host.toLowerCase()) {
    return { allowed: false, reason: "ORIGIN_MISMATCH" };
  }

  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );

  if (
    forwardedProtocol &&
    `${forwardedProtocol.toLowerCase()}:` !== origin.protocol
  ) {
    return { allowed: false, reason: "PROTOCOL_MISMATCH" };
  }

  return { allowed: true };
}
