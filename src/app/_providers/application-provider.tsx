"use client";

import type { ReactNode } from "react";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

export function ApplicationProvider({ children }: { children: ReactNode }) {
  return <BrowserQueryProvider>{children}</BrowserQueryProvider>;
}
