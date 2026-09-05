import type { QueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  directoryFiltersSchema,
  serializeDirectoryFilters,
  type DirectoryFiltersInput,
} from "../schemas/catalog-directory.schema";
import type { DirectoryFilters } from "../types/catalog-directory.types";
import {
  directoryBrowserPageSchema,
  type DirectoryBrowserPageDto,
} from "./catalog-directory.contract";

const protectedCatalogRoot = ["catalog", "protected"] as const;
const directoryListsRoot = [
  ...protectedCatalogRoot,
  "directory",
  "list",
] as const;

export const directoryKeys = {
  all: protectedCatalogRoot,
  list(input: DirectoryFiltersInput) {
    const filters = directoryFiltersSchema.parse(input);

    return [...directoryListsRoot, filters] as const;
  },
  lists() {
    return directoryListsRoot;
  },
  protected() {
    return protectedCatalogRoot;
  },
};

export async function fetchDirectoryPage(
  input: DirectoryFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<DirectoryBrowserPageDto> {
  const filters: DirectoryFilters = directoryFiltersSchema.parse(input);
  const searchParams = serializeDirectoryFilters(filters);
  const response = await client.get<unknown>(
    `/catalog/directory?${searchParams.toString()}`,
    { signal },
  );

  return directoryBrowserPageSchema.parse(response.data);
}

export async function clearProtectedCatalogQueries(queryClient: QueryClient) {
  const filters = { queryKey: directoryKeys.protected() };

  await queryClient.cancelQueries(filters, { silent: true });
  queryClient.removeQueries(filters);
}
