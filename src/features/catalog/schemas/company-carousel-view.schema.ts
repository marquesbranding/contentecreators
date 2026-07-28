import { z } from "zod";

import { COMPANY_CAROUSEL_MAX_LIMIT } from "../types/company-carousel.types";
import { catalogSignedMediaSchema } from "./catalog-detail-view.schema";

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
    items: z.array(
      z
        .object({
          displayName: z.string().trim().min(1).max(160),
          logo: catalogSignedMediaSchema,
          websiteUrl: z.url().refine(isSafeWebsiteUrl).nullable(),
        })
        .strict(),
    ),
    limit: z.number().int().min(1).max(COMPANY_CAROUSEL_MAX_LIMIT),
  })
  .strict();
