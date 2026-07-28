import type { QueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  clearProtectedCatalogQueries,
  creatorCatalogKeys,
  fetchCreatorCatalogPage,
} from "./creator-catalog.api";

const emptyPage = {
  items: [],
  nextCursor: null,
  pageSize: 20,
} as const;

describe("creator catalog browser API", () => {
  it("uses a stable normalized key for equivalent filters", () => {
    expect(
      creatorCatalogKeys.list({
        pageSize: 20,
        search: "  Moda ",
        state: "sp",
      }),
    ).toEqual(
      creatorCatalogKeys.list({
        city: undefined,
        creatorType: undefined,
        cursor: undefined,
        niche: undefined,
        pageSize: 20,
        platform: undefined,
        search: "Moda",
        state: "SP",
      }),
    );
  });

  it("forwards cancellation and canonical URL filters to Axios", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: emptyPage });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchCreatorCatalogPage(
        {
          city: "São Paulo",
          creatorType: "UGC",
          cursor: "next_page",
          niche: "moda",
          pageSize: 20,
          platform: "INSTAGRAM",
          search: "Criadora",
          state: "sp",
        },
        signal,
        client,
      ),
    ).resolves.toEqual(emptyPage);

    expect(get).toHaveBeenCalledWith(
      "/catalog/creators?search=Criadora&niche=moda&platform=INSTAGRAM&city=S%C3%A3o+Paulo&state=SP&creatorType=UGC&cursor=next_page&pageSize=20",
      { signal },
    );
  });

  it("rejects server-only media references at the browser boundary", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              avatar: null,
              avatarAssetId: "a0000000-0000-4000-8000-000000000001",
              bioExcerpt: null,
              city: null,
              creatorId: "a0000000-0000-4000-8000-000000000002",
              creatorType: "UGC",
              displayName: "Ana",
              niches: [],
              socialPlatforms: [],
              state: null,
            },
          ],
          nextCursor: null,
          pageSize: 20,
        },
      }),
    } as unknown as AxiosInstance;

    await expect(
      fetchCreatorCatalogPage(
        { pageSize: 20 },
        new AbortController().signal,
        client,
      ),
    ).rejects.toThrow();
  });

  it("cancels before permanently removing every protected catalog query", async () => {
    const cancelQueries = vi.fn().mockResolvedValue(undefined);
    const removeQueries = vi.fn();
    const client = {
      cancelQueries,
      removeQueries,
    } as unknown as QueryClient;

    await clearProtectedCatalogQueries(client);

    const filters = { queryKey: creatorCatalogKeys.protected() };
    expect(cancelQueries).toHaveBeenCalledWith(filters, { silent: true });
    expect(removeQueries).toHaveBeenCalledWith(filters);
    expect(cancelQueries.mock.invocationCallOrder[0]).toBeLessThan(
      removeQueries.mock.invocationCallOrder[0]!,
    );
  });
});
