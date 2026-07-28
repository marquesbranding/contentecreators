import "server-only";

import type {
  CompanyCarouselRequest,
  CompanyCarouselViewResponseDto,
} from "@/features/catalog";
import {
  createCompanyCarouselViewService,
  createServerCompanyCarouselService,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";

export async function loadServerCompanyCarousel(
  input: CompanyCarouselRequest,
  requestId: string,
): Promise<CompanyCarouselViewResponseDto> {
  const companyService = await createServerCompanyCarouselService();
  const viewService = createCompanyCarouselViewService({
    getSignedMedia: getServerSignedMedia,
    listCompanies: companyService.list,
  });

  return viewService.list(input, requestId);
}
