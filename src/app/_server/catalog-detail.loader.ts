import "server-only";

import type {
  CatalogCreatorDetailViewDto,
  CatalogDetailQuery,
} from "@/features/catalog";
import {
  createCatalogDetailViewService,
  createServerCatalogDetailService,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";

export async function loadServerCatalogDetail(
  input: CatalogDetailQuery,
): Promise<CatalogCreatorDetailViewDto | null> {
  const detailService = await createServerCatalogDetailService();
  const viewService = createCatalogDetailViewService({
    getSignedMedia: getServerSignedMedia,
    loadDetail: detailService.load,
  });

  return viewService.load(input);
}
