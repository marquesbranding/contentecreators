import "server-only";

import type { CompanyCarouselRequest } from "../../types/company-carousel.types";
import type { CatalogSignedMediaDto } from "../../types/catalog-detail-view.types";
import type {
  CompanyCarouselViewItemDto,
  CompanyCarouselViewResponseDto,
} from "../../types/company-carousel-view.types";
interface CatalogSignedMediaSource {
  expiresAt: string;
  height: number | null;
  mimeType: CatalogSignedMediaDto["mimeType"];
  url: string;
  width: number | null;
}

interface CompanyCarouselViewServiceDependencies {
  getSignedMedia(assetId: string): Promise<CatalogSignedMediaSource | null>;
  listCompanies(
    input: CompanyCarouselRequest,
    requestId: string,
  ): Promise<{
    facets: { segments: string[] };
    items: {
      city: string | null;
      companyId: string;
      description: string | null;
      displayName: string;
      email: string;
      logo: { alt: string; assetId: string } | null;
      segment: string | null;
      state: string | null;
      websiteUrl: string | null;
      whatsappE164: string | null;
    }[];
    limit: number;
  }>;
}

export function createCompanyCarouselViewService({
  getSignedMedia,
  listCompanies,
}: CompanyCarouselViewServiceDependencies) {
  return {
    async list(
      input: CompanyCarouselRequest,
      requestId: string,
    ): Promise<CompanyCarouselViewResponseDto> {
      const response = await listCompanies(input, requestId);
      const resolved = await Promise.all(
        response.items.map(async (company) => {
          const media = company.logo
            ? await getSignedMedia(company.logo.assetId)
            : null;

          if (company.logo && !media) {
            return null;
          }

          return {
            city: company.city,
            companyId: company.companyId,
            description: company.description,
            displayName: company.displayName,
            email: company.email,
            logo:
              company.logo && media
                ? {
                    alt: company.logo.alt,
                    expiresAt: media.expiresAt,
                    height: media.height,
                    mimeType: media.mimeType,
                    url: media.url,
                    width: media.width,
                  }
                : null,
            segment: company.segment,
            state: company.state,
            websiteUrl: company.websiteUrl,
            whatsappE164: company.whatsappE164,
          } satisfies CompanyCarouselViewItemDto;
        }),
      );

      return {
        facets: response.facets,
        items: resolved.filter(
          (item): item is CompanyCarouselViewItemDto => item !== null,
        ),
        limit: response.limit,
      };
    },
  };
}
