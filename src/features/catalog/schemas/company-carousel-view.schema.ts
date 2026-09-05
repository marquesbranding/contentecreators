import { z } from "zod";

import { COMPANY_CAROUSEL_MAX_LIMIT } from "../types/company-carousel.types";
import { catalogSignedMediaSchema } from "./catalog-detail-view.schema";
import { companyCarouselFacetsSchema } from "./company-carousel.schema";

function isSafeWebsiteUrl(value: string) {
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

export const companyCarouselViewResponseSchema = z
  .object({
    facets: companyCarouselFacetsSchema,
    items: z.array(
      z
        .object({
          city: z.string().trim().min(1).max(120).nullable(),
          companyId: z.uuid(),
          description: z.string().trim().min(1).max(220).nullable(),
          displayName: z.string().trim().min(1).max(160),
          email: z.email().max(320),
          logo: catalogSignedMediaSchema.nullable(),
          segment: z.string().trim().min(1).max(120).nullable(),
          state: z
            .string()
            .regex(/^[A-Z]{2}$/u)
            .nullable(),
          websiteUrl: z.url().refine(isSafeWebsiteUrl).nullable(),
          whatsappE164: z
            .string()
            .regex(/^\+[1-9]\d{7,14}$/u)
            .nullable(),
        })
        .strict(),
    ),
    limit: z.number().int().min(1).max(COMPANY_CAROUSEL_MAX_LIMIT),
  })
  .strict();
