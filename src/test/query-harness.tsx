import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "@/shared/query/query-client";

export function createQueryTestClient() {
  const client = createQueryClient();

  client.setDefaultOptions({
    mutations: {
      retry: false,
    },
    queries: {
      gcTime: Number.POSITIVE_INFINITY,
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    },
  });

  return client;
}

export function QueryTestProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: QueryClient;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
