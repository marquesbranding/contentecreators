"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { HttpClientError } from "@/shared/api/http-client";

import {
  createSponsorshipPlacement,
  fetchSponsorshipPlacements,
  mutateSponsorshipPlacement,
  sponsorshipManagementKeys,
  updateSponsorshipPlacement,
} from "../api/sponsorship-management.api";
import {
  sponsorshipManagementFiltersSchema,
  type SponsorshipManagementFilters,
  type SponsorshipManagementResponseDto,
  type SponsorshipPlacementCommand,
  type SponsorshipPlacementWriteInput,
} from "../api/sponsorship-management.contract";

type SponsorshipManagementFetcher = (
  filters: SponsorshipManagementFilters,
  signal: AbortSignal,
) => Promise<SponsorshipManagementResponseDto>;

type CreatePlacement = typeof createSponsorshipPlacement;
type UpdatePlacement = typeof updateSponsorshipPlacement;
type CommandPlacement = typeof mutateSponsorshipPlacement;

export function createUseSponsorshipManagement(
  fetchPlacements: SponsorshipManagementFetcher,
) {
  return function useSponsorshipManagementWithFetcher(
    input: Partial<SponsorshipManagementFilters>,
  ) {
    const filters = sponsorshipManagementFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchPlacements(filters, signal),
      queryKey: sponsorshipManagementKeys.list(filters),
    });
  };
}

export function createUseSponsorshipPlacementMutations(dependencies: {
  command: CommandPlacement;
  create: CreatePlacement;
  update: UpdatePlacement;
}) {
  return function useSponsorshipPlacementMutations() {
    const queryClient = useQueryClient();

    async function invalidateLists() {
      await queryClient.invalidateQueries({
        queryKey: sponsorshipManagementKeys.lists(),
      });
    }

    async function synchronizePlacement(data: { placement: { id: string } }) {
      queryClient.setQueryData(
        sponsorshipManagementKeys.detail(data.placement.id),
        data.placement,
      );
      await invalidateLists();
    }

    async function reconcileVersionConflict(
      error: unknown,
      placementId?: string,
    ) {
      if (!(error instanceof HttpClientError) || error.status !== 409) {
        return;
      }

      if (placementId) {
        await queryClient.invalidateQueries({
          queryKey: sponsorshipManagementKeys.detail(placementId),
        });
      }
      await invalidateLists();
    }

    const createMutation = useMutation({
      mutationFn: (input: SponsorshipPlacementWriteInput) =>
        dependencies.create(input),
      onSuccess: synchronizePlacement,
    });
    const updateMutation = useMutation({
      mutationFn: ({
        input,
        placementId,
      }: {
        input: SponsorshipPlacementWriteInput;
        placementId: string;
      }) => dependencies.update(placementId, input),
      onError: (error, variables) =>
        reconcileVersionConflict(error, variables.placementId),
      onSuccess: synchronizePlacement,
    });
    const commandMutation = useMutation({
      mutationFn: ({
        input,
        placementId,
      }: {
        input: SponsorshipPlacementCommand;
        placementId: string;
      }) => dependencies.command(placementId, input),
      onError: (error, variables) =>
        reconcileVersionConflict(error, variables.placementId),
      onSuccess: synchronizePlacement,
    });

    return {
      command: commandMutation,
      create: createMutation,
      update: updateMutation,
    };
  };
}

export const useSponsorshipManagement = createUseSponsorshipManagement(
  fetchSponsorshipPlacements,
);
export const useSponsorshipPlacementMutations =
  createUseSponsorshipPlacementMutations({
    command: mutateSponsorshipPlacement,
    create: createSponsorshipPlacement,
    update: updateSponsorshipPlacement,
  });
