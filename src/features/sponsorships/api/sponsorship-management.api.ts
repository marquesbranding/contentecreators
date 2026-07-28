import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  serializeSponsorshipManagementFilters,
  sponsorshipManagementFiltersSchema,
  sponsorshipManagementResponseSchema,
  sponsorshipPlacementCommandSchema,
  sponsorshipPlacementMutationResponseSchema,
  sponsorshipPlacementWriteSchema,
  type SponsorshipManagementFilters,
  type SponsorshipManagementResponseDto,
  type SponsorshipPlacementCommand,
  type SponsorshipPlacementWriteInput,
} from "./sponsorship-management.contract";

const all = ["backoffice", "sponsorships"] as const;

export const sponsorshipManagementKeys = {
  all,
  detail(placementId: string) {
    return [...all, "detail", placementId] as const;
  },
  list(input: Partial<SponsorshipManagementFilters>) {
    const filters = sponsorshipManagementFiltersSchema.parse(input);
    return [...all, "list", filters] as const;
  },
  lists() {
    return [...all, "list"] as const;
  },
};

export async function fetchSponsorshipPlacements(
  input: Partial<SponsorshipManagementFilters>,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<SponsorshipManagementResponseDto> {
  const filters = sponsorshipManagementFiltersSchema.parse(input);
  const searchParams = serializeSponsorshipManagementFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/sponsorships?${searchParams.toString()}`,
    { signal },
  );

  return sponsorshipManagementResponseSchema.parse(response.data);
}

export async function createSponsorshipPlacement(
  input: SponsorshipPlacementWriteInput,
  client: AxiosInstance = httpClient,
) {
  const command = sponsorshipPlacementWriteSchema
    .omit({ expectedVersion: true })
    .parse(input);
  const response = await client.post<unknown>(
    "/backoffice/sponsorships",
    command,
  );

  return sponsorshipPlacementMutationResponseSchema.parse(response.data);
}

export async function updateSponsorshipPlacement(
  placementId: string,
  input: SponsorshipPlacementWriteInput,
  client: AxiosInstance = httpClient,
) {
  const command = sponsorshipPlacementWriteSchema
    .required({ expectedVersion: true })
    .parse(input);
  const response = await client.patch<unknown>(
    `/backoffice/sponsorships/${placementId}`,
    command,
  );

  return sponsorshipPlacementMutationResponseSchema.parse(response.data);
}

export async function mutateSponsorshipPlacement(
  placementId: string,
  input: SponsorshipPlacementCommand,
  client: AxiosInstance = httpClient,
) {
  const command = sponsorshipPlacementCommandSchema.parse(input);
  const response = await client.post<unknown>(
    `/backoffice/sponsorships/${placementId}/commands`,
    command,
  );

  return sponsorshipPlacementMutationResponseSchema.parse(response.data);
}
