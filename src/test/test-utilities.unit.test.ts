import { describe, expect, it } from "vitest";

import { createHttpMock } from "@/test/http-mock";
import {
  createRouterFixture,
  createSearchParamsFixture,
} from "@/test/navigation-fixtures";
import { createQueryTestClient } from "@/test/query-harness";

describe("test utilities", () => {
  it("creates isolated QueryClient caches", () => {
    const first = createQueryTestClient();
    const second = createQueryTestClient();

    first.setQueryData(["fixture"], "first");

    expect(second.getQueryData(["fixture"])).toBeUndefined();
  });

  it("creates a restorable typed Axios mock", async () => {
    const { client, mock, restore } = createHttpMock();
    mock.onGet("/fixture").reply(200, { ok: true });

    await expect(client.get("/fixture")).resolves.toMatchObject({
      data: { ok: true },
    });

    restore();
  });

  it("creates router and search-parameter fixtures", () => {
    const router = createRouterFixture();
    const searchParams = createSearchParamsFixture({
      page: "2",
      status: "APPROVED",
    });

    router.push(`/catalog?${searchParams.toString()}`);

    expect(searchParams.get("status")).toBe("APPROVED");
    expect(router.push).toHaveBeenCalledWith("/catalog?page=2&status=APPROVED");
  });
});
