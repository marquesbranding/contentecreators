import { z } from "zod";

import {
  catalogCreatorTypeSchema,
  catalogSocialPlatformSchema,
} from "./creator-catalog.schema";

function isSafeHttpUrl(value: string) {
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

export const catalogSignedMediaSchema = z
  .object({
    alt: z.string().trim().min(1).max(240),
    expiresAt: z.iso.datetime(),
    height: z.number().int().positive().nullable(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    url: z.url().refine(isSafeHttpUrl),
    width: z.number().int().positive().nullable(),
  })
  .strict();

const unavailableContactSchema = z
  .object({
    reason: z.enum([
      "CONSENT_NOT_GRANTED",
      "NO_CONTACT_CHANNELS",
      "VIEWER_NOT_COMPANY",
    ]),
    status: z.literal("UNAVAILABLE"),
  })
  .strict();

const availableContactSchema = z
  .object({
    email: z
      .object({ href: z.string().startsWith("mailto:") })
      .strict()
      .nullable(),
    social: z.array(
      z
        .object({
          href: z.url().refine(isSafeHttpUrl),
          platform: catalogSocialPlatformSchema,
        })
        .strict(),
    ),
    status: z.literal("AVAILABLE"),
    whatsapp: z
      .object({ href: z.url().startsWith("https://wa.me/") })
      .strict()
      .nullable(),
  })
  .strict();

export const catalogCreatorDetailViewSchema = z
  .object({
    bio: z.string().trim().min(1).max(4_000),
    contact: z.discriminatedUnion("status", [
      unavailableContactSchema,
      availableContactSchema,
    ]),
    creatorId: z.uuid(),
    creatorType: catalogCreatorTypeSchema,
    displayName: z.string().trim().min(1).max(160),
    location: z
      .object({
        city: z.string().trim().min(1).max(120),
        state: z.string().regex(/^[A-Z]{2}$/u),
      })
      .strict(),
    media: z
      .object({
        avatar: catalogSignedMediaSchema.nullable(),
        cover: catalogSignedMediaSchema.nullable(),
      })
      .strict(),
    metrics: z.array(
      z
        .object({
          engagementRate: z.number().min(0).max(100).nullable(),
          followerCount: z.number().int().nonnegative().nullable(),
          interactionCount: z.number().int().nonnegative().nullable(),
          isPrimary: z.boolean(),
          observedOn: z.iso.date(),
          platform: catalogSocialPlatformSchema,
          source: z.literal("SELF_REPORTED"),
          viewCount: z.number().int().nonnegative().nullable(),
        })
        .strict(),
    ),
    niches: z.array(
      z
        .object({
          name: z.string().trim().min(1).max(120),
          slug: z.string().trim().min(1).max(80),
        })
        .strict(),
    ),
    socialProfiles: z.array(
      z
        .object({
          handle: z.string().trim().max(160).nullable(),
          platform: catalogSocialPlatformSchema,
        })
        .strict(),
    ),
    whatsappContactCount: z.number().int().nonnegative(),
  })
  .strict();
