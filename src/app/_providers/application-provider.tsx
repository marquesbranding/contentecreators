"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getBrowserQueryClient } from "@/shared/query/browser-query-client";
import { AppStoreProvider } from "@/shared/store/app-store-provider";

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const queryClient = getBrowserQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>{children}</AppStoreProvider>
    </QueryClientProvider>
  );
}
