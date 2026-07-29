"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getBrowserQueryClient } from "./browser-query-client";

export function BrowserQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getBrowserQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
