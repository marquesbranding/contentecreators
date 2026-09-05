import { loadServerCatalogDirectoryPage } from "@/app/_server/catalog-directory-page.loader";
import { createCatalogDirectoryRouteHandlerWithLoader } from "@/features/catalog/server";

export const GET = createCatalogDirectoryRouteHandlerWithLoader(
  loadServerCatalogDirectoryPage,
);
