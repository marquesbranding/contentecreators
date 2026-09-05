import { z } from "zod";

import { catalogSocialPlatformSchema } from "./creator-catalog.schema";
import type { DirectoryFilters } from "../types/catalog-directory.types";

export const DIRECTORY_DEFAULT_PAGE_SIZE = 20;
export const DIRECTORY_MAX_PAGE_SIZE = 50;

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const trimmedOptionalText = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(maximum).optional(),
  );

const optionalNonNegativeInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().nonnegative().optional(),
);

const pageSizeFromUrl = z
  .preprocess(
    (value) =>
      value === undefined || value === ""
        ? DIRECTORY_DEFAULT_PAGE_SIZE
        : Number(value),
    z.number().int().positive().max(DIRECTORY_MAX_PAGE_SIZE),
  )
  .default(DIRECTORY_DEFAULT_PAGE_SIZE);

export const directoryTypeFilterSchema = z.enum([
  "COMPANY",
  "INFLUENCER",
  "UGC",
]);

export const directoryCursorPayloadSchema = z
  .object({
    createdAt: z.iso.datetime({ offset: true }),
    id: z.uuid(),
    kind: z.enum(["COMPANY", "CREATOR"]),
  })
  .strict();

export const directoryFiltersSchema = z
  .object({
    city: trimmedOptionalText(120),
    cursor: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .min(1)
        .max(512)
        .regex(/^[A-Za-z0-9_-]+$/u, "Cursor inválido.")
        .optional(),
    ),
    followersMax: optionalNonNegativeInt,
    followersMin: optionalNonNegativeInt,
    interactionsMax: optionalNonNegativeInt,
    interactionsMin: optionalNonNegativeInt,
    newFollowersMax: optionalNonNegativeInt,
    newFollowersMin: optionalNonNegativeInt,
    niche: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Nicho inválido.")
        .optional(),
    ),
    pageSize: pageSizeFromUrl,
    platform: z.preprocess(
      emptyToUndefined,
      catalogSocialPlatformSchema.optional(),
    ),
    search: trimmedOptionalText(120),
    segment: trimmedOptionalText(120),
    state: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/u, "UF inválida.")
        .optional(),
    ),
    type: z.preprocess((value) => {
      if (value === undefined || value === "") {
        return undefined;
      }

      return Array.isArray(value) ? value : [value];
    }, z.array(directoryTypeFilterSchema).min(1).max(3).optional()),
    viewsMax: optionalNonNegativeInt,
    viewsMin: optionalNonNegativeInt,
  })
  .strict();

export function parseDirectorySearchParams(searchParams: URLSearchParams) {
  const entries: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    entries[key] = key === "type" ? values : (values[0] ?? "");
  }

  return directoryFiltersSchema.parse(entries);
}

const singleValueFilterKeys = [
  "search",
  "niche",
  "segment",
  "platform",
  "city",
  "state",
  "followersMin",
  "followersMax",
  "viewsMin",
  "viewsMax",
  "interactionsMin",
  "interactionsMax",
  "newFollowersMin",
  "newFollowersMax",
  "cursor",
] as const;

export function serializeDirectoryFilters(
  input: Partial<DirectoryFilters>,
): URLSearchParams {
  const filters = directoryFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  for (const key of singleValueFilterKeys) {
    const value = filters[key];

    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  for (const type of filters.type ?? []) {
    searchParams.append("type", type);
  }

  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type DirectoryFiltersInput = z.input<typeof directoryFiltersSchema>;
export type { DirectoryFilters };
