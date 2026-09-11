"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchLandingShowcaseCandidates,
  landingShowcaseManagementKeys,
  sendLandingShowcaseCommand,
} from "../api/landing-showcase-management.api";
import type { LandingShowcaseCommand } from "../api/landing-showcase-management.contract";

export function useLandingShowcaseCandidates() {
  return useQuery({
    queryFn: ({ signal }) => fetchLandingShowcaseCandidates(signal),
    queryKey: landingShowcaseManagementKeys.all,
  });
}

export function useLandingShowcaseCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LandingShowcaseCommand) =>
      sendLandingShowcaseCommand(input),
    // A rejected command (e.g. a version conflict) means the list on screen is
    // stale, so refetch rather than keep showing it.
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: landingShowcaseManagementKeys.all,
      }),
    onSuccess: (lists) => {
      queryClient.setQueryData(landingShowcaseManagementKeys.all, lists);
    },
  });
}
