import "server-only";

import type {
  DirectoryBrowserEntryDto,
  DirectoryBrowserPageDto,
} from "../../api/catalog-directory.contract";
import type { DirectoryPageDto } from "../../types/catalog-directory.types";
import type { CatalogSignedImageResolver } from "./creator-catalog-browser.mapper";

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
    // The entry remains discoverable when an expiring media URL cannot be
    // issued. The browser renders its explicit image fallback instead.
    return null;
  }
}

export async function toDirectoryBrowserPage(
  page: DirectoryPageDto,
  resolveImage: CatalogSignedImageResolver,
): Promise<DirectoryBrowserPageDto> {
  const items = await Promise.all(
    page.items.map(async (entry): Promise<DirectoryBrowserEntryDto> => {
      if (entry.kind === "COMPANY") {
        const { logoAssetId, ...company } = entry;
        const logo = await resolveCatalogImage(logoAssetId, resolveImage);

        return { ...company, logo };
      }

      const { avatarAssetId, coverAssetId, ...creator } = entry;
      const [avatar, cover] = await Promise.all([
        resolveCatalogImage(avatarAssetId, resolveImage),
        resolveCatalogImage(coverAssetId, resolveImage),
      ]);

      return { ...creator, avatar, cover };
    }),
  );

  return {
    ...page,
    items,
  };
}
