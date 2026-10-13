import { advertisingCookieMatchers } from "./cookie-registry";
import {
  cookieDomainCandidates,
  createConsentRecord,
  readConsentFromCookieHeader,
  serializeConsentCookie,
} from "./consent-cookie";

export type ConsentSnapshot =
  | { status: "unknown" }
  | { status: "undecided" }
  | { ads: boolean; status: "decided" };

type Listener = () => void;

const listeners = new Set<Listener>();
let preferencesOpen = false;
let cachedHeader: string | null = null;
let cachedSnapshot: ConsentSnapshot = { status: "unknown" };

export const SERVER_CONSENT_SNAPSHOT: ConsentSnapshot = { status: "unknown" };

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeToConsent(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getConsentSnapshot(): ConsentSnapshot {
  const header = document.cookie;

  if (header !== cachedHeader) {
    cachedHeader = header;
    const record = readConsentFromCookieHeader(header, new Date());
    cachedSnapshot = record
      ? { ads: record.ads, status: "decided" }
      : { status: "undecided" };
  }

  return cachedSnapshot;
}

export function subscribeToPreferences(listener: Listener) {
  return subscribeToConsent(listener);
}

export function getPreferencesOpen() {
  return preferencesOpen;
}

export function setPreferencesOpen(next: boolean) {
  if (preferencesOpen !== next) {
    preferencesOpen = next;
    emit();
  }
}

export function removeAdvertisingCookies() {
  const names = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) =>
      advertisingCookieMatchers.some((matcher) => matcher.test(name)),
    );
  const expired = "Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const domains = cookieDomainCandidates(window.location.hostname);

  for (const name of names) {
    document.cookie = `${name}=; Path=/; ${expired}`;
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Domain=${domain}; ${expired}`;
      document.cookie = `${name}=; Path=/; Domain=.${domain}; ${expired}`;
    }
  }
}

/** Persists the decision; revoking also clears advertising cookies. */
export function saveConsent(ads: boolean) {
  const previous = getConsentSnapshot();
  const wasAccepted = previous.status === "decided" && previous.ads;

  document.cookie = serializeConsentCookie(
    createConsentRecord(ads, new Date()),
    {
      secure: window.location.protocol === "https:",
    },
  );

  if (!ads) {
    removeAdvertisingCookies();
  }

  preferencesOpen = false;
  emit();

  if (wasAccepted && !ads) {
    // Already-loaded third-party scripts cannot be unloaded; a fresh page does
    // not request them again.
    window.location.reload();
  }
}
