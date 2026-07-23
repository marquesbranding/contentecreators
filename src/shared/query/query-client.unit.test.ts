import { describe, expect, it } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";
import {
  createQueryClient,
  defineQueryKeys,
} from "@/shared/query/query-client";

describe("createQueryClient", () => {
  it("creates isolated caches for each server request", () => {
    const firstRequest = createQueryClient();
    const secondRequest = createQueryClient();

    firstRequest.setQueryData(["account"], { name: "Primeira pessoa" });

    expect(firstRequest).not.toBe(secondRequest);
    expect(secondRequest.getQueryData(["account"])).toBeUndefined();
  });

  it("never retries authorization errors and bounds transient retries", () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;

    expect(retry).toBeTypeOf("function");

    if (typeof retry !== "function") {
      throw new Error("A retry policy must be a function.");
    }

    const unauthorized = new HttpClientError({
      code: "UNAUTHORIZED",
      message: "Sessão expirada.",
      status: 401,
    });
    const serverError = new HttpClientError({
      code: "SERVER_ERROR",
      message: "Falha temporária.",
      status: 503,
    });

    expect(retry(0, unauthorized)).toBe(false);
    expect(retry(0, serverError)).toBe(true);
    expect(retry(2, serverError)).toBe(false);
  });
});

describe("defineQueryKeys", () => {
  it("keeps a feature namespace and stable list/detail shapes", () => {
    const keys = defineQueryKeys("company-profile");

    expect(keys.all).toEqual(["company-profile"]);
    expect(keys.lists()).toEqual(["company-profile", "list"]);
    expect(keys.list({ status: "APPROVED", page: 2 })).toEqual([
      "company-profile",
      "list",
      { status: "APPROVED", page: 2 },
    ]);
    expect(keys.details()).toEqual(["company-profile", "detail"]);
    expect(keys.detail("company-123")).toEqual([
      "company-profile",
      "detail",
      "company-123",
    ]);
  });
});
