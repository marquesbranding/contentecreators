import "server-only";

import type {
  CompanyDetailQuery,
  CompanyDetailViewDto,
} from "@/features/catalog";
import {
  createCompanyDetailViewService,
  createServerCompanyDetailService,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";

export async function loadServerCompanyDetail(
  input: CompanyDetailQuery,
): Promise<CompanyDetailViewDto | null> {
  const detailService = await createServerCompanyDetailService();
  const viewService = createCompanyDetailViewService({
    getSignedMedia: getServerSignedMedia,
    loadDetail: detailService.load,
  });

  return viewService.load(input);
}
