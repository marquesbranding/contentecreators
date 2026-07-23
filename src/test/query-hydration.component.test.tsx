import {
  dehydrate,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeatureHydrationBoundary } from "@/shared/query/feature-hydration-boundary";
import { createQueryTestClient, QueryTestProvider } from "@/test/query-harness";

function HydratedValue({
  queryFunction = () => Promise.resolve("network"),
}: {
  queryFunction?: () => Promise<string>;
}) {
  const query = useQuery({
    queryFn: queryFunction,
    queryKey: ["hydration-fixture"],
  });

  return <p>{query.data}</p>;
}

describe("query hydration test harness", () => {
  it("hydrates one client-owned view without a network duplicate", () => {
    const serverClient = createQueryTestClient();
    const browserClient = createQueryTestClient();
    const queryFunction = vi.fn(() => Promise.resolve("network"));

    serverClient.setQueryData(["hydration-fixture"], "prefetched");

    render(
      <QueryClientProvider client={browserClient}>
        <FeatureHydrationBoundary state={dehydrate(serverClient)}>
          <HydratedValue queryFunction={queryFunction} />
        </FeatureHydrationBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText("prefetched")).toBeInTheDocument();
    expect(queryFunction).not.toHaveBeenCalled();
  });

  it("provides an isolated wrapper for hook and component tests", () => {
    const client = createQueryTestClient();

    render(
      <QueryTestProvider client={client}>
        <span>conteúdo isolado</span>
      </QueryTestProvider>,
    );

    expect(screen.getByText("conteúdo isolado")).toBeInTheDocument();
  });
});
