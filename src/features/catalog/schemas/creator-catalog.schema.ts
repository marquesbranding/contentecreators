import { z } from "zod";

import type { CreatorCatalogFilters } from "../types/creator-catalog.types";

export const CREATOR_CATALOG_DEFAULT_PAGE_SIZE = 20;
export const CREATOR_CATALOG_MAX_PAGE_SIZE = 50;

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const trimmedOptionalText = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(maximum).optional(),
  );

const pageSizeFromUrl = z
  .preprocess(
    (value) =>
      value === undefined || value === ""
        ? CREATOR_CATALOG_DEFAULT_PAGE_SIZE
        : Number(value),
    z.number().int().positive().max(CREATOR_CATALOG_MAX_PAGE_SIZE),
  )
  .default(CREATOR_CATALOG_DEFAULT_PAGE_SIZE);

export const catalogCreatorTypeSchema = z.enum(["INFLUENCER", "UGC"]);
export const catalogSocialPlatformSchema = z.enum([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "OTHER",
]);

export const creatorCatalogCursorPayloadSchema = z
  .object({
    creatorProfileId: z.uuid(),
    displayName: z.string().trim().min(2).max(120),
  })
  .strict();

export const creatorCatalogFiltersSchema = z
  .object({
    city: trimmedOptionalText(120),
    creatorType: z.preprocess(
      emptyToUndefined,
      catalogCreatorTypeSchema.optional(),
    ),
    cursor: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .min(1)
        .max(512)
        .regex(/^[A-Za-z0-9_-]+$/u, "Cursor inválido.")
        .optional(),
    ),
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
    state: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/u, "UF inválida.")
        .optional(),
    ),
  })
  .strict();

export function parseCreatorCatalogSearchParams(searchParams: URLSearchParams) {
  return creatorCatalogFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeCreatorCatalogFilters(
  input: Partial<CreatorCatalogFilters>,
) {
  const filters = creatorCatalogFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  for (const key of [
    "search",
    "niche",
    "platform",
    "city",
    "state",
    "creatorType",
    "cursor",
  ] as const) {
    const value = filters[key];

    if (value) {
      searchParams.set(key, value);
    }
  }

  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type CreatorCatalogFiltersInput = z.input<
  typeof creatorCatalogFiltersSchema
>;
