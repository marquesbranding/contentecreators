import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  landingShowcaseCommandSchema,
  landingShowcaseManagementResponseSchema,
  type LandingShowcaseCommand,
  type LandingShowcaseManagementResponseDto,
} from "./landing-showcase-management.contract";

export const landingShowcaseManagementKeys = {
  all: ["backoffice", "landing-showcase"] as const,
};

export async function fetchLandingShowcaseCandidates(
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<LandingShowcaseManagementResponseDto> {
  const response = await client.get<unknown>("/backoffice/landing-showcase", {
    signal,
  });

  return landingShowcaseManagementResponseSchema.parse(response.data);
}

/** Applies one command and answers with both refreshed lists. */
export async function sendLandingShowcaseCommand(
  input: LandingShowcaseCommand,
  client: AxiosInstance = httpClient,
): Promise<LandingShowcaseManagementResponseDto> {
  const command = landingShowcaseCommandSchema.parse(input);
  const response = await client.post<unknown>(
    "/backoffice/landing-showcase",
    command,
  );

  return landingShowcaseManagementResponseSchema.parse(response.data);
}
