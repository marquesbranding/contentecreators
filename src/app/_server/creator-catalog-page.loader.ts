import "server-only";

import type { CreatorCatalogBrowserPageDto } from "@/features/catalog";
import {
  createServerCreatorCatalogService,
  toCreatorCatalogBrowserPage,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";
import type { CreatorCatalogFiltersInput } from "@/features/catalog";

export async function loadServerCreatorCatalogPage(
  input: CreatorCatalogFiltersInput,
  requestId: string,
): Promise<CreatorCatalogBrowserPageDto> {
  const service = await createServerCreatorCatalogService();
  const page = await service.list(input, requestId);

  return toCreatorCatalogBrowserPage(page, async (assetId) => {
    const media = await getServerSignedMedia(assetId);

    if (!media) {
      return null;
    }

    return {
      height: media.height,
      url: media.url,
      width: media.width,
    };
  });
}
