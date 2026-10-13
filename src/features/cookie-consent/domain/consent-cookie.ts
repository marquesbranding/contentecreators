import { COOKIE_REGISTRY_VERSION } from "./cookie-registry";

export const CONSENT_COOKIE_NAME = "cc_cookie_consent";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentRecord = {
  /** Advertising and measurement cookies accepted. */
  ads: boolean;
  /** ISO timestamp of the decision. */
  at: string;
  /** Registry version the visitor decided on. */
  v: number;
};

export function createConsentRecord(ads: boolean, now: Date): ConsentRecord {
  return { ads, at: now.toISOString(), v: COOKIE_REGISTRY_VERSION };
}

export function serializeConsentCookie(
  record: ConsentRecord,
  options: { secure: boolean },
): string {
  return [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}

/**
 * Returns the stored decision only while it is well-formed, made on the current
 * registry version and not older than 12 months; otherwise `null` (undecided).
 */
export function parseConsentValue(
  rawValue: string | undefined,
  now: Date,
): ConsentRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(rawValue));

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as ConsentRecord).ads !== "boolean" ||
      typeof (parsed as ConsentRecord).at !== "string" ||
      (parsed as ConsentRecord).v !== COOKIE_REGISTRY_VERSION
    ) {
      return null;
    }

    const decidedAt = Date.parse((parsed as ConsentRecord).at);

    if (
      Number.isNaN(decidedAt) ||
      decidedAt > now.getTime() ||
      now.getTime() - decidedAt > CONSENT_MAX_AGE_SECONDS * 1000
    ) {
      return null;
    }

    return parsed as ConsentRecord;
  } catch {
    return null;
  }
}

export function readConsentFromCookieHeader(
  cookieHeader: string,
  now: Date,
): ConsentRecord | null {
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE_NAME}=`));

  return parseConsentValue(
    entry ? entry.slice(CONSENT_COOKIE_NAME.length + 1) : undefined,
    now,
  );
}

/** Host plus every parent domain a tracker could have used for its cookie. */
export function cookieDomainCandidates(hostname: string): string[] {
  const parts = hostname.split(".");
  const candidates: string[] = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    candidates.push(parts.slice(index).join("."));
  }

  return candidates;
}
