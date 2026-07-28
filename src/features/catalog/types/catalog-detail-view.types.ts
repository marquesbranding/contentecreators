import type { SupportedImageMimeType } from "@/shared/lib/media/image-validation";

import type { CatalogCreatorDetailDto } from "./catalog-detail.types";

export interface CatalogSignedMediaDto {
  alt: string;
  expiresAt: string;
  height: number | null;
  mimeType: SupportedImageMimeType;
  url: string;
  width: number | null;
}

export interface CatalogCreatorDetailViewDto extends Omit<
  CatalogCreatorDetailDto,
  "media"
> {
  media: {
    avatar: CatalogSignedMediaDto | null;
    cover: CatalogSignedMediaDto | null;
  };
}
