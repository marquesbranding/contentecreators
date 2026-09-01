import { z } from "zod";

import { safeSponsorshipLinkSchema } from "../schemas/sponsorship-placement.schema";

export const sponsorshipPlacementTypeSchema = z.enum([
  "TOP_BANNER",
  "INLINE_BANNER",
  "CAROUSEL",
  "FEATURED_CREATOR",
]);

export const sponsorshipAudienceSchema = z.enum([
  "ALL",
  "INFLUENCER",
  "COMPANY",
]);

export const sponsorshipOperationalStateSchema = z.enum([
  "ACTIVE",
  "ARCHIVED",
  "DRAFT",
  "EXPIRED",
  "SCHEDULED",
]);

export const sponsorshipManagementFiltersSchema = z
  .object({
    audience: sponsorshipAudienceSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(120).default(""),
    state: sponsorshipOperationalStateSchema.optional(),
    type: sponsorshipPlacementTypeSchema.optional(),
  })
  .strict()
  .transform((filters) => ({
    ...filters,
    search: filters.search || "",
  }));

const sponsorshipAdminMediaSchema = z
  .object({
    alt: z.string().min(1).max(200),
    height: z.number().int().positive().nullable(),
    url: safeSponsorshipLinkSchema,
    width: z.number().int().positive().nullable(),
  })
  .strict();

export const sponsorshipAdminPlacementSchema = z
  .object({
    activationIssues: z.array(z.string().min(1)).default([]),
    advertiserLabel: z.string().nullable(),
    archivedAt: z.iso.datetime().nullable(),
    audience: sponsorshipAudienceSchema,
    body: z.string().nullable(),
    creative: sponsorshipAdminMediaSchema.nullable(),
    creativeAssetId: z.uuid().nullable(),
    creativeAssetMobileId: z.uuid().nullable(),
    creativeAssetTabletId: z.uuid().nullable(),
    creativeMobile: sponsorshipAdminMediaSchema.nullable(),
    creativeTablet: sponsorshipAdminMediaSchema.nullable(),
    endsAt: z.iso.datetime().nullable(),
    featuredCreatorName: z.string().nullable(),
    featuredCreatorProfileId: z.uuid().nullable(),
    id: z.uuid(),
    isActive: z.boolean(),
    linkLabel: z.string().nullable(),
    linkUrl: safeSponsorshipLinkSchema.nullable(),
    placementType: sponsorshipPlacementTypeSchema,
    slotKey: z.string().min(1).max(100),
    sortOrder: z.number().int(),
    startsAt: z.iso.datetime().nullable(),
    state: sponsorshipOperationalStateSchema,
    title: z.string().nullable(),
    updatedAt: z.iso.datetime(),
    version: z.number().int().positive(),
  })
  .strict();

export const sponsorshipManagementResponseSchema = z
  .object({
    items: z.array(sponsorshipAdminPlacementSchema),
    pagination: z
      .object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1),
        totalItems: z.number().int().min(0),
        totalPages: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();

export const sponsorshipPlacementWriteSchema = z
  .object({
    advertiserLabel: z.string().trim().min(1).max(160).nullable(),
    audience: sponsorshipAudienceSchema,
    body: z.string().trim().max(500).nullable(),
    creativeAssetId: z.uuid().nullable(),
    creativeAssetMobileId: z.uuid().nullable(),
    creativeAssetTabletId: z.uuid().nullable(),
    endsAt: z.iso.datetime().nullable(),
    expectedVersion: z.number().int().positive().optional(),
    featuredCreatorProfileId: z.uuid().nullable(),
    isActive: z.literal(false),
    linkLabel: z.string().trim().min(1).max(80).nullable(),
    linkUrl: safeSponsorshipLinkSchema.nullable(),
    placementType: sponsorshipPlacementTypeSchema,
    reason: z.string().trim().min(8).max(500),
    slotKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
      .max(100),
    sortOrder: z.number().int().min(0),
    startsAt: z.iso.datetime().nullable(),
    title: z.string().trim().min(1).max(160).nullable(),
  })
  .strict();

export const sponsorshipPlacementMutationResponseSchema = z
  .object({
    placement: sponsorshipAdminPlacementSchema,
  })
  .strict();

export const sponsorshipPlacementCommandSchema = z
  .object({
    action: z.enum(["ACTIVATE", "ARCHIVE", "DEACTIVATE", "REORDER"]),
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(8).max(500),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((command, context) => {
    if (command.action === "REORDER" && command.sortOrder === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe a nova ordem.",
        path: ["sortOrder"],
      });
    }

    if (command.action !== "REORDER" && command.sortOrder !== undefined) {
      context.addIssue({
        code: "custom",
        message: "A ordem só pode ser informada ao reordenar.",
        path: ["sortOrder"],
      });
    }
  });

export type SponsorshipAudience = z.infer<typeof sponsorshipAudienceSchema>;
export type SponsorshipManagementFilters = z.infer<
  typeof sponsorshipManagementFiltersSchema
>;
export type SponsorshipManagementResponseDto = z.infer<
  typeof sponsorshipManagementResponseSchema
>;
export type SponsorshipAdminPlacementDto = z.infer<
  typeof sponsorshipAdminPlacementSchema
>;
export type SponsorshipPlacementCommand = z.infer<
  typeof sponsorshipPlacementCommandSchema
>;
export type SponsorshipPlacementType = z.infer<
  typeof sponsorshipPlacementTypeSchema
>;
export type SponsorshipPlacementWriteInput = z.infer<
  typeof sponsorshipPlacementWriteSchema
>;

export function serializeSponsorshipManagementFilters(
  input: z.input<typeof sponsorshipManagementFiltersSchema>,
) {
  const filters = sponsorshipManagementFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  if (filters.type) searchParams.set("type", filters.type);
  if (filters.audience) searchParams.set("audience", filters.audience);
  if (filters.state) searchParams.set("state", filters.state);
  if (filters.search) searchParams.set("search", filters.search);
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export function parseSponsorshipManagementSearchParams(
  searchParams: URLSearchParams,
) {
  return sponsorshipManagementFiltersSchema.parse({
    audience: searchParams.get("audience") || undefined,
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
    search: searchParams.get("search") || undefined,
    state: searchParams.get("state") || undefined,
    type: searchParams.get("type") || undefined,
  });
}
