"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchModerationQueue,
  moderationQueueKeys,
} from "../api/moderation-queue.api";
import {
  moderationQueueFiltersSchema,
  type ModerationQueueFiltersInput,
} from "../schemas/moderation-queue.schema";
import type { ModerationQueueResponseDto } from "../types/moderation-queue.types";
import type { ModerationQueueFilters } from "../types/moderation-queue.types";

type QueueFetcher = (
  filters: ModerationQueueFilters,
  signal: AbortSignal,
) => Promise<ModerationQueueResponseDto>;

export function createUseModerationQueue(fetchQueue: QueueFetcher) {
  return function useModerationQueueWithFetcher(
    input: ModerationQueueFiltersInput,
  ) {
    const filters = moderationQueueFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchQueue(filters, signal),
      queryKey: moderationQueueKeys.list(filters),
    });
  };
}

export const useModerationQueue =
  createUseModerationQueue(fetchModerationQueue);
