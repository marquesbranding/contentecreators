import type { QueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  creatorCatalogFiltersSchema,
  serializeCreatorCatalogFilters,
  type CreatorCatalogFiltersInput,
} from "../schemas/creator-catalog.schema";
import type { CreatorCatalogFilters } from "../types/creator-catalog.types";
import {
  creatorCatalogBrowserPageSchema,
  type CreatorCatalogBrowserPageDto,
} from "./creator-catalog.contract";

const protectedCatalogRoot = ["catalog", "protected"] as const;
const creatorListsRoot = [...protectedCatalogRoot, "creators", "list"] as const;

export const creatorCatalogKeys = {
  all: protectedCatalogRoot,
  list(input: CreatorCatalogFiltersInput) {
    const filters = creatorCatalogFiltersSchema.parse(input);

    return [...creatorListsRoot, filters] as const;
  },
  lists() {
    return creatorListsRoot;
  },
  protected() {
    return protectedCatalogRoot;
  },
};

export async function fetchCreatorCatalogPage(
  input: CreatorCatalogFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<CreatorCatalogBrowserPageDto> {
  const filters: CreatorCatalogFilters =
    creatorCatalogFiltersSchema.parse(input);
  const searchParams = serializeCreatorCatalogFilters(filters);
  const response = await client.get<unknown>(
    `/catalog/creators?${searchParams.toString()}`,
    { signal },
  );

  return creatorCatalogBrowserPageSchema.parse(response.data);
}

export async function clearProtectedCatalogQueries(queryClient: QueryClient) {
  const filters = { queryKey: creatorCatalogKeys.protected() };

  await queryClient.cancelQueries(filters, { silent: true });
  queryClient.removeQueries(filters);
}
