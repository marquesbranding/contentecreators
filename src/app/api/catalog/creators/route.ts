import { loadServerCreatorCatalogPage } from "@/app/_server/creator-catalog-page.loader";
import { createCreatorCatalogRouteHandlerWithLoader } from "@/features/catalog/server";

export const GET = createCreatorCatalogRouteHandlerWithLoader(
  loadServerCreatorCatalogPage,
);
