"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { CreatorCatalogView } from "./creator-catalog-view.client";

export function HydratedCreatorCatalog({
  state,
  viewerRole,
}: {
  state: DehydratedState;
  viewerRole: "COMPANY" | "INFLUENCER";
}) {
  return (
    <BrowserQueryProvider>
      <HydrationBoundary state={state}>
        <CreatorCatalogView viewerRole={viewerRole} />
      </HydrationBoundary>
    </BrowserQueryProvider>
  );
}
