"use client";

import type { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "@/shared/query/query-client";

let browserQueryClient: QueryClient | undefined;

export function getBrowserQueryClient() {
  if (typeof window === "undefined") {
    return createQueryClient();
  }

  browserQueryClient ??= createQueryClient();

  return browserQueryClient;
}
