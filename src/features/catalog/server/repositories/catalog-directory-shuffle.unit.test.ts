import { afterEach, describe, expect, it, vi } from "vitest";

import {
  directoryShuffleDay,
  directoryShuffleSeed,
  directoryShuffleSeedForDay,
} from "./catalog-directory-shuffle";

describe("catalog directory shuffle seed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the calendar day in America/Sao_Paulo, not UTC", () => {
    // 02:59 UTC on the 14th is still 23:59 on the 13th in Sao Paulo (UTC-3).
    expect(directoryShuffleDay(new Date("2026-10-14T02:59:59.999Z"))).toBe(
      "2026-10-13",
    );
    expect(directoryShuffleDay(new Date("2026-10-14T03:00:00.000Z"))).toBe(
      "2026-10-14",
    );
  });

  it("rolls the year over at local midnight", () => {
    expect(directoryShuffleDay(new Date("2027-01-01T02:59:59.000Z"))).toBe(
      "2026-12-31",
    );
    expect(directoryShuffleDay(new Date("2027-01-01T03:00:00.000Z"))).toBe(
      "2027-01-01",
    );
  });

  it("is stable within a day and changes across the local day boundary", () => {
    const morning = directoryShuffleSeed(new Date("2026-10-13T11:00:00.000Z"));
    const evening = directoryShuffleSeed(new Date("2026-10-14T02:00:00.000Z"));
    const nextDay = directoryShuffleSeed(new Date("2026-10-14T03:30:00.000Z"));

    expect(evening).toBe(morning);
    expect(nextDay).not.toBe(morning);
  });

  it("combines the day with a fixed default salt", () => {
    vi.stubEnv("CATALOG_SHUFFLE_SALT", "");

    const seed = directoryShuffleSeedForDay("2026-10-13");

    expect(seed).toMatch(/^2026-10-13:.+/u);
    expect(directoryShuffleSeed(new Date("2026-10-13T15:00:00.000Z"))).toBe(
      seed,
    );
  });

  it("mixes in CATALOG_SHUFFLE_SALT when configured", () => {
    vi.stubEnv("CATALOG_SHUFFLE_SALT", "  segredo-de-teste  ");

    expect(directoryShuffleSeedForDay("2026-10-13")).toBe(
      "2026-10-13:segredo-de-teste",
    );

    vi.stubEnv("CATALOG_SHUFFLE_SALT", "outro-segredo");

    expect(directoryShuffleSeedForDay("2026-10-13")).toBe(
      "2026-10-13:outro-segredo",
    );
  });
});
