import { z } from "zod";

import {
  COMPANY_CAROUSEL_DEFAULT_LIMIT,
  COMPANY_CAROUSEL_MAX_LIMIT,
} from "../types/company-carousel.types";

function isSafeCompanyWebsiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isSafeProtocol =
      url.protocol === "http:" || url.protocol === "https:";
    const hasCredentials = Boolean(url.username || url.password);

    return isSafeProtocol && !hasCredentials;
  } catch {
    return false;
  }
}

export const companyCarouselLogoReferenceSchema = z
  .object({
    alt: z.string().trim().min(1).max(240),
    assetId: z.uuid(),
  })
  .strict();

export const companyCarouselItemSchema = z
  .object({
    city: z.string().trim().min(1).max(120).nullable(),
    companyId: z.uuid(),
    description: z.string().trim().min(1).max(220).nullable(),
    displayName: z.string().trim().min(1).max(160),
    email: z.email().max(320),
    logo: companyCarouselLogoReferenceSchema.nullable(),
    segment: z.string().trim().min(1).max(120).nullable(),
    state: z
      .string()
      .regex(/^[A-Z]{2}$/u)
      .nullable(),
    websiteUrl: z.url().refine(isSafeCompanyWebsiteUrl).nullable(),
    whatsappE164: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/u)
      .nullable(),
  })
  .strict();

export const companyCarouselFacetsSchema = z
  .object({
    segments: z.array(z.string().trim().min(1).max(120)),
  })
  .strict();

export const companyCarouselResponseSchema = z
  .object({
    facets: companyCarouselFacetsSchema,
    items: z.array(companyCarouselItemSchema).max(COMPANY_CAROUSEL_MAX_LIMIT),
    limit: z.number().int().min(1).max(COMPANY_CAROUSEL_MAX_LIMIT),
  })
  .strict();

export function parseCompanyCarouselLimit(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return COMPANY_CAROUSEL_DEFAULT_LIMIT;
  }

  return Math.min(value, COMPANY_CAROUSEL_MAX_LIMIT);
}

function parseOptionalTrimmedText(
  value: string | null | undefined,
  maxLength: number,
): string | undefined {
  const trimmed = value?.trim();

  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

export function parseCompanyCarouselSearch(
  value: string | null | undefined,
): string | undefined {
  return parseOptionalTrimmedText(value, 120);
}

export function parseCompanyCarouselSegment(
  value: string | null | undefined,
): string | undefined {
  return parseOptionalTrimmedText(value, 120);
}

export function toSafeCompanyWebsiteUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!isSafeCompanyWebsiteUrl(value)) {
    return null;
  }

  return new URL(value).toString();
}
