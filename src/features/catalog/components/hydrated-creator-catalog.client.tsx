"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { CreatorCatalogView } from "./creator-catalog-view.client";

export function HydratedCreatorCatalog({ state }: { state: DehydratedState }) {
  return (
    <BrowserQueryProvider>
      <HydrationBoundary state={state}>
        <CreatorCatalogView />
      </HydrationBoundary>
    </BrowserQueryProvider>
  );
}
