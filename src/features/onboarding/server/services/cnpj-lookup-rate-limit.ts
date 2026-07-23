import "server-only";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const attempts = new Map<string, { count: number; expiresAt: number }>();

export function consumeCnpjLookupCapacity(key: string, now = Date.now()) {
  const normalizedKey = key.slice(0, 160);
  const current = attempts.get(normalizedKey);

  if (!current || current.expiresAt <= now) {
    attempts.set(normalizedKey, {
      count: 1,
      expiresAt: now + WINDOW_MS,
    });
    return true;
  }

  if (current.count >= MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  return true;
}
