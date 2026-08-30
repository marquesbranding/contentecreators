import "server-only";

import type {
  CatalogSignedImageDto,
  CreatorCatalogBrowserPageDto,
} from "../../api/creator-catalog.contract";
import type { CreatorCatalogPageDto } from "../../types/creator-catalog.types";

export type CatalogSignedImageResolver = (
  assetId: string,
) => Promise<CatalogSignedImageDto | null>;

async function resolveCatalogImage(
  assetId: string | null | undefined,
  resolveImage: CatalogSignedImageResolver,
) {
  if (!assetId) {
    return null;
  }

  try {
    return await resolveImage(assetId);
  } catch {
    // The profile remains discoverable when an expiring media URL cannot be
    // issued. The browser renders its explicit image fallback instead.
    return null;
  }
}

export async function toCreatorCatalogBrowserPage(
  page: CreatorCatalogPageDto,
  resolveImage: CatalogSignedImageResolver,
): Promise<CreatorCatalogBrowserPageDto> {
  const items = await Promise.all(
    page.items.map(async ({ avatarAssetId, coverAssetId, ...creator }) => {
      const [avatar, cover] = await Promise.all([
        resolveCatalogImage(avatarAssetId, resolveImage),
        resolveCatalogImage(coverAssetId, resolveImage),
      ]);

      return {
        ...creator,
        avatar,
        cover,
      };
    }),
  );

  return {
    ...page,
    items,
  };
}
