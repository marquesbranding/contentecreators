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
    items: {
      displayName: string;
      logo: { alt: string; assetId: string };
      websiteUrl: string | null;
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
          const media = await getSignedMedia(company.logo.assetId);

          if (!media) {
            return null;
          }

          return {
            displayName: company.displayName,
            logo: {
              alt: company.logo.alt,
              expiresAt: media.expiresAt,
              height: media.height,
              mimeType: media.mimeType,
              url: media.url,
              width: media.width,
            },
            websiteUrl: company.websiteUrl,
          } satisfies CompanyCarouselViewItemDto;
        }),
      );

      return {
        items: resolved.filter(
          (item): item is CompanyCarouselViewItemDto => item !== null,
        ),
        limit: response.limit,
      };
    },
  };
}
