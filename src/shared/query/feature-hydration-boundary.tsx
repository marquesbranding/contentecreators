import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function FeatureHydrationBoundary({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
