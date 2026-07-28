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
    displayName: z.string().trim().min(1).max(160),
    logo: companyCarouselLogoReferenceSchema,
    websiteUrl: z.url().refine(isSafeCompanyWebsiteUrl).nullable(),
  })
  .strict();

export const companyCarouselResponseSchema = z
  .object({
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

export function toSafeCompanyWebsiteUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!isSafeCompanyWebsiteUrl(value)) {
    return null;
  }

  return new URL(value).toString();
}
