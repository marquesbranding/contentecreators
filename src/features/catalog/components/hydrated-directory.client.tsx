"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { DirectoryView } from "./directory-view.client";

export function HydratedDirectory({
  sponsoredCards,
  state,
}: {
  sponsoredCards?: { key: string; node: ReactNode }[];
  state: DehydratedState;
}) {
  return (
    <BrowserQueryProvider>
      <HydrationBoundary state={state}>
        <DirectoryView sponsoredCards={sponsoredCards} />
      </HydrationBoundary>
    </BrowserQueryProvider>
  );
}
