import "server-only";

import type { CatalogDetailQuery } from "../../schemas/catalog-detail.schema";
import type { CatalogCreatorDetailDto } from "../../types/catalog-detail.types";
import type {
  CatalogCreatorDetailViewDto,
  CatalogSignedMediaDto,
} from "../../types/catalog-detail-view.types";

interface CatalogSignedMediaSource {
  expiresAt: string;
  height: number | null;
  mimeType: CatalogSignedMediaDto["mimeType"];
  url: string;
  width: number | null;
}

interface CatalogDetailViewServiceDependencies {
  getSignedMedia(assetId: string): Promise<CatalogSignedMediaSource | null>;
  loadDetail(
    input: CatalogDetailQuery,
  ): Promise<CatalogCreatorDetailDto | null>;
}

function toCatalogSignedMedia(
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

export function createCatalogDetailViewService({
  getSignedMedia,
  loadDetail,
}: CatalogDetailViewServiceDependencies) {
  return {
    async load(
      input: CatalogDetailQuery,
    ): Promise<CatalogCreatorDetailViewDto | null> {
      const detail = await loadDetail(input);

      if (!detail) {
        return null;
      }

      const [avatar, cover] = await Promise.all([
        detail.media.avatar
          ? getSignedMedia(detail.media.avatar.assetId)
          : Promise.resolve(null),
        detail.media.cover
          ? getSignedMedia(detail.media.cover.assetId)
          : Promise.resolve(null),
      ]);

      return {
        ...detail,
        media: {
          avatar: toCatalogSignedMedia(
            avatar,
            `Foto de perfil de ${detail.displayName}`,
          ),
          cover: toCatalogSignedMedia(
            cover,
            `Imagem de capa de ${detail.displayName}`,
          ),
        },
      };
    },
  };
}
