import type { AxiosInstance } from "axios";

import { httpClient, HttpClientError } from "@/shared/api/http-client";

import { catalogCreatorDetailViewSchema } from "../schemas/catalog-detail-view.schema";
import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";

const all = ["catalog", "creator-detail"] as const;

export const catalogDetailKeys = {
  all,
  detail(creatorId: string) {
    return [...all, creatorId] as const;
  },
};

function isEligibilityLoss(error: unknown) {
  return (
    error instanceof HttpClientError &&
    (error.code === "UNAUTHORIZED" ||
      error.code === "FORBIDDEN" ||
      error.status === 404)
  );
}

export async function fetchCatalogDetail(
  creatorId: string,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<CatalogCreatorDetailViewDto | null> {
  try {
    const response = await client.get<unknown>(
      `/catalog/creators/${encodeURIComponent(creatorId)}`,
      { signal },
    );

    return catalogCreatorDetailViewSchema.parse(response.data);
  } catch (error) {
    if (isEligibilityLoss(error)) {
      return null;
    }

    throw error;
  }
}
