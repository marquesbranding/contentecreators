import { z } from "zod";

import {
  catalogSocialPlatformSchema,
  catalogCreatorTypeSchema,
} from "../schemas/creator-catalog.schema";
import { DIRECTORY_MAX_PAGE_SIZE } from "../schemas/catalog-directory.schema";
import type {
  DirectoryCompanyEntryDto,
  DirectoryCreatorEntryDto,
  DirectoryEntryDto,
  DirectoryFacetsDto,
  DirectoryPageDto,
} from "../types/catalog-directory.types";
import { catalogSignedImageSchema } from "./creator-catalog.contract";

const directoryNicheSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  })
  .strict();

export const directoryCompanyBrowserEntrySchema = z
  .object({
    city: z.string().trim().max(120).nullable(),
    companyId: z.uuid(),
    createdAt: z.iso.datetime({ offset: true }),
    description: z.string().trim().max(220).nullable(),
    displayName: z.string().trim().min(1).max(160),
    kind: z.literal("COMPANY"),
    logo: catalogSignedImageSchema.nullable(),
    segment: z.string().trim().max(120).nullable(),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/u)
      .nullable(),
    websiteUrl: z.url().nullable(),
  })
  .strict();

export const directoryCreatorBrowserEntrySchema = z
  .object({
    avatar: catalogSignedImageSchema.nullable(),
    bioExcerpt: z.string().trim().max(280).nullable(),
    city: z.string().trim().max(120).nullable(),
    cover: catalogSignedImageSchema.nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    creatorId: z.uuid(),
    creatorType: catalogCreatorTypeSchema,
    displayName: z.string().trim().min(2).max(120),
    kind: z.literal("CREATOR"),
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
    niches: z.array(directoryNicheSchema).max(20),
    socialPlatforms: z.array(catalogSocialPlatformSchema).max(20),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/u)
      .nullable(),
    whatsappContactCount: z.number().int().nonnegative(),
  })
  .strict();

export const directoryBrowserEntrySchema = z.discriminatedUnion("kind", [
  directoryCompanyBrowserEntrySchema,
  directoryCreatorBrowserEntrySchema,
]);

export const directoryFacetsSchema = z
  .object({
    cities: z.array(z.string().trim().min(1)).max(500),
    niches: z.array(directoryNicheSchema).max(100),
    segments: z.array(z.string().trim().min(1)).max(200),
    states: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[A-Z]{2}$/u),
      )
      .max(30),
  })
  .strict();

export const directoryBrowserPageSchema = z
  .object({
    facets: directoryFacetsSchema,
    items: z.array(directoryBrowserEntrySchema).max(DIRECTORY_MAX_PAGE_SIZE),
    nextCursor: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .nullable(),
    pageSize: z.number().int().positive().max(DIRECTORY_MAX_PAGE_SIZE),
  })
  .strict();

export interface DirectoryCompanyBrowserEntryDto extends Omit<
  DirectoryCompanyEntryDto,
  "logoAssetId"
> {
  logo: CatalogSignedImageDto | null;
}

export interface DirectoryCreatorBrowserEntryDto extends Omit<
  DirectoryCreatorEntryDto,
  "avatarAssetId" | "coverAssetId"
> {
  avatar: CatalogSignedImageDto | null;
  cover: CatalogSignedImageDto | null;
}

export type DirectoryBrowserEntryDto =
  DirectoryCompanyBrowserEntryDto | DirectoryCreatorBrowserEntryDto;

export interface DirectoryBrowserPageDto extends Omit<
  DirectoryPageDto,
  "items"
> {
  items: DirectoryBrowserEntryDto[];
}

export type { DirectoryEntryDto, DirectoryFacetsDto };
export interface CatalogSignedImageDto {
  height: number | null;
  url: string;
  width: number | null;
}
