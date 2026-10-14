import "server-only";

/**
 * Daily directory shuffle. The catalog is ordered by `md5(profile id || seed)`,
 * where the seed combines the calendar day in America/Sao_Paulo with a
 * server-side salt. The cursor only ever carries the day: the salt stays on the
 * server so the order is not trivially predictable from the client.
 */
const SHUFFLE_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_SHUFFLE_SALT = "contente-creators-catalog-shuffle-v1";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: SHUFFLE_TIME_ZONE,
  year: "numeric",
});

/** Calendar day (`YYYY-MM-DD`) of `now` in America/Sao_Paulo. */
export function directoryShuffleDay(now: Date): string {
  const parts = Object.fromEntries(
    dayFormatter.formatToParts(now).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shuffleSalt() {
  const configured = process.env.CATALOG_SHUFFLE_SALT?.trim();

  return configured ? configured : DEFAULT_SHUFFLE_SALT;
}

/** Seed fed to `md5(id::text || seed)` for a shuffle day (day + server salt). */
export function directoryShuffleSeedForDay(day: string): string {
  return `${day}:${shuffleSalt()}`;
}

/** Seed for `now`: `YYYY-MM-DD` in America/Sao_Paulo combined with the salt. */
export function directoryShuffleSeed(now: Date): string {
  return directoryShuffleSeedForDay(directoryShuffleDay(now));
}
