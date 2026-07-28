import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  moderationQueueFiltersSchema,
  moderationQueueResponseSchema,
  serializeModerationQueueFilters,
  type ModerationQueueFiltersInput,
} from "../schemas/moderation-queue.schema";
import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
} from "../types/moderation-queue.types";

const all = ["backoffice", "moderation", "queue"] as const;

export const moderationQueueKeys = {
  all,
  list(input: ModerationQueueFiltersInput) {
    const filters = moderationQueueFiltersSchema.parse(input);
    return [...all, "list", filters] as const;
  },
  lists() {
    return [...all, "list"] as const;
  },
};

export async function fetchModerationQueue(
  input: ModerationQueueFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<ModerationQueueResponseDto> {
  const filters: ModerationQueueFilters =
    moderationQueueFiltersSchema.parse(input);
  const searchParams = serializeModerationQueueFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/moderation?${searchParams.toString()}`,
    { signal },
  );

  return moderationQueueResponseSchema.parse(response.data);
}
