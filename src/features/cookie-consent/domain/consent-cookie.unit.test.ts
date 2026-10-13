import { describe, expect, it } from "vitest";

import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  cookieDomainCandidates,
  createConsentRecord,
  parseConsentValue,
  readConsentFromCookieHeader,
  serializeConsentCookie,
} from "./consent-cookie";
import { COOKIE_REGISTRY_VERSION } from "./cookie-registry";

const now = new Date("2026-10-13T12:00:00Z");

function valueOf(record: unknown) {
  return encodeURIComponent(JSON.stringify(record));
}

describe("consent cookie", () => {
  it("round-trips a decision made now", () => {
    const record = createConsentRecord(true, now);
    const cookie = serializeConsentCookie(record, { secure: true });

    expect(cookie).toContain(`${CONSENT_COOKIE_NAME}=`);
    expect(cookie).toContain(`Max-Age=${CONSENT_MAX_AGE_SECONDS}`);
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(
      readConsentFromCookieHeader(`a=1; ${cookie.split(";")[0]}`, now),
    ).toEqual(record);
  });

  it("omits Secure on plain HTTP", () => {
    expect(
      serializeConsentCookie(createConsentRecord(false, now), {
        secure: false,
      }),
    ).not.toContain("Secure");
  });

  it("is undecided when missing, malformed or tampered with", () => {
    expect(parseConsentValue(undefined, now)).toBeNull();
    expect(parseConsentValue("%7Bnot-json", now)).toBeNull();
    expect(
      parseConsentValue(
        valueOf({
          ads: "yes",
          at: now.toISOString(),
          v: COOKIE_REGISTRY_VERSION,
        }),
        now,
      ),
    ).toBeNull();
  });

  it("asks again after the registry version changes", () => {
    expect(
      parseConsentValue(
        valueOf({
          ads: true,
          at: now.toISOString(),
          v: COOKIE_REGISTRY_VERSION + 1,
        }),
        now,
      ),
    ).toBeNull();
  });

  it("asks again after 12 months and rejects future dates", () => {
    const old = new Date(now.getTime() - (CONSENT_MAX_AGE_SECONDS + 1) * 1000);
    const future = new Date(now.getTime() + 60_000);

    expect(
      parseConsentValue(valueOf(createConsentRecord(true, old)), now),
    ).toBeNull();
    expect(
      parseConsentValue(valueOf(createConsentRecord(true, future)), now),
    ).toBeNull();
  });

  it("lists the host and parent domains a tracker may use", () => {
    expect(cookieDomainCandidates("www.contentecreators.com.br")).toEqual([
      "www.contentecreators.com.br",
      "contentecreators.com.br",
      "com.br",
    ]);
    expect(cookieDomainCandidates("localhost")).toEqual([]);
  });
});
