import "server-only";

import type { DirectoryBrowserPageDto } from "@/features/catalog";
import {
  createServerCatalogDirectoryService,
  toDirectoryBrowserPage,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";
import type { DirectoryFiltersInput } from "@/features/catalog";

export async function loadServerCatalogDirectoryPage(
  input: DirectoryFiltersInput,
  requestId: string,
): Promise<DirectoryBrowserPageDto> {
  const service = await createServerCatalogDirectoryService();
  const page = await service.list(input, requestId);

  return toDirectoryBrowserPage(page, async (assetId) => {
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
