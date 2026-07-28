import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";

import {
  companyCarouselKeys,
  fetchCompanyCarousel,
} from "./company-carousel.api";

describe("company carousel browser API", () => {
  it("bounds the request, keeps a stable key, and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: { items: [], limit: 24 } });
    const client = { get } as unknown as AxiosInstance;

    await expect(fetchCompanyCarousel(200, signal, client)).resolves.toEqual({
      items: [],
      limit: 24,
    });
    expect(companyCarouselKeys.list(200)).toEqual([
      "catalog",
      "company-carousel",
      24,
    ]);
    expect(get).toHaveBeenCalledWith("/catalog/companies?limit=24", {
      signal,
    });
  });

  it("replaces a stale carousel after authorization loss", async () => {
    const client = {
      get: vi.fn().mockRejectedValue(
        new HttpClientError({
          code: "FORBIDDEN",
          message: "safe",
          status: 403,
        }),
      ),
    } as unknown as AxiosInstance;

    await expect(
      fetchCompanyCarousel(12, new AbortController().signal, client),
    ).resolves.toEqual({ items: [], limit: 12 });
  });
});
