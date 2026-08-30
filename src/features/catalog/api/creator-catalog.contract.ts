import { z } from "zod";

import {
  CREATOR_CATALOG_MAX_PAGE_SIZE,
  catalogCreatorTypeSchema,
  catalogSocialPlatformSchema,
} from "../schemas/creator-catalog.schema";
import type {
  CreatorCatalogCardDto,
  CreatorCatalogPageDto,
} from "../types/creator-catalog.types";

function isSafeSignedMediaUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export const catalogSignedImageSchema = z
  .object({
    height: z.number().int().positive().max(4_096).nullable(),
    url: z.url().max(2_048).refine(isSafeSignedMediaUrl),
    width: z.number().int().positive().max(4_096).nullable(),
  })
  .strict();

export const creatorCatalogBrowserCardSchema = z
  .object({
    avatar: catalogSignedImageSchema.nullable(),
    bioExcerpt: z.string().trim().max(280).nullable(),
    city: z.string().trim().max(120).nullable(),
    cover: catalogSignedImageSchema.nullable(),
    creatorId: z.uuid(),
    creatorType: catalogCreatorTypeSchema,
    displayName: z.string().trim().min(2).max(120),
    metrics: z
      .array(
        z
          .object({
            engagementRate: z.number().min(0).max(100).nullable(),
            followerCount: z.number().int().nonnegative().nullable(),
            handle: z.string().trim().max(160).nullable(),
            interactionCount: z.number().int().nonnegative().nullable(),
            isPrimary: z.boolean(),
            observedOn: z.iso.date(),
            platform: catalogSocialPlatformSchema,
            source: z.literal("SELF_REPORTED"),
            viewCount: z.number().int().nonnegative().nullable(),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    niches: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            slug: z
              .string()
              .trim()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
          })
          .strict(),
      )
      .max(20),
    socialPlatforms: z.array(catalogSocialPlatformSchema).max(20),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/u)
      .nullable(),
  })
  .strict();

export const creatorCatalogBrowserPageSchema = z
  .object({
    items: z
      .array(creatorCatalogBrowserCardSchema)
      .max(CREATOR_CATALOG_MAX_PAGE_SIZE),
    nextCursor: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .nullable(),
    pageSize: z.number().int().positive().max(CREATOR_CATALOG_MAX_PAGE_SIZE),
  })
  .strict();

export interface CreatorCatalogBrowserCardDto extends Omit<
  CreatorCatalogCardDto,
  "avatarAssetId" | "coverAssetId"
> {
  avatar: CatalogSignedImageDto | null;
  cover: CatalogSignedImageDto | null;
}

export interface CreatorCatalogBrowserPageDto extends Omit<
  CreatorCatalogPageDto,
  "items"
> {
  items: CreatorCatalogBrowserCardDto[];
}

export interface CatalogSignedImageDto {
  height: number | null;
  url: string;
  width: number | null;
}
