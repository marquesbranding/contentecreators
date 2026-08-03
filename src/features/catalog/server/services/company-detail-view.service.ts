import "server-only";

import type { CompanyDetailQuery } from "../../schemas/company-detail.schema";
import type {
  CompanyDetailDto,
  CompanyDetailViewDto,
} from "../../types/company-detail.types";
import type { CatalogSignedMediaDto } from "../../types/catalog-detail-view.types";

interface CatalogSignedMediaSource {
  expiresAt: string;
  height: number | null;
  mimeType: CatalogSignedMediaDto["mimeType"];
  url: string;
  width: number | null;
}

interface CompanyDetailViewServiceDependencies {
  getSignedMedia(assetId: string): Promise<CatalogSignedMediaSource | null>;
  loadDetail(input: CompanyDetailQuery): Promise<CompanyDetailDto | null>;
}

function toSignedMedia(
  media: CatalogSignedMediaSource | null,
  alt: string,
): CatalogSignedMediaDto | null {
  if (!media) {
    return null;
  }

  return {
    alt,
    expiresAt: media.expiresAt,
    height: media.height,
    mimeType: media.mimeType,
    url: media.url,
    width: media.width,
  };
}

export function createCompanyDetailViewService({
  getSignedMedia,
  loadDetail,
}: CompanyDetailViewServiceDependencies) {
  return {
    async load(
      input: CompanyDetailQuery,
    ): Promise<CompanyDetailViewDto | null> {
      const detail = await loadDetail(input);

      if (!detail) {
        return null;
      }

      const [logo, cover] = await Promise.all([
        detail.media.logo
          ? getSignedMedia(detail.media.logo.assetId)
          : Promise.resolve(null),
        detail.media.cover
          ? getSignedMedia(detail.media.cover.assetId)
          : Promise.resolve(null),
      ]);

      return {
        ...detail,
        media: {
          cover: toSignedMedia(
            cover,
            `Imagem de capa de ${detail.displayName}`,
          ),
          logo: toSignedMedia(logo, `Logo da ${detail.displayName}`),
        },
      };
    },
  };
}
