import { describe, expect, it } from "vitest";

import {
  accountManagementFiltersSchema,
  parseAccountManagementSearchParams,
  serializeAccountManagementFilters,
} from "./account-management.schema";

describe("account management filters", () => {
  it("normalizes defaults and trims search text", () => {
    expect(
      accountManagementFiltersSchema.parse({ search: "  Empresa Dois  " }),
    ).toEqual({
      archive: "ACTIVE",
      order: "NEWEST",
      page: 1,
      pageSize: 20,
      role: undefined,
      search: "Empresa Dois",
      status: undefined,
    });
  });

  it("clamps the page size and rejects unsupported filters", () => {
    expect(
      parseAccountManagementSearchParams(
        new URLSearchParams("pageSize=500&archive=ARCHIVED&role=ADMIN"),
      ),
    ).toMatchObject({
      archive: "ARCHIVED",
      pageSize: 50,
      role: "ADMIN",
    });

    expect(() =>
      parseAccountManagementSearchParams(new URLSearchParams("status=DELETED")),
    ).toThrow();
  });

  it("serializes canonical URL-owned filters", () => {
    expect(
      serializeAccountManagementFilters({
        archive: "ALL",
        order: "NAME_ASC",
        page: 2,
        pageSize: 10,
        role: "COMPANY",
        search: "Empresa",
        status: "APPROVED",
      }).toString(),
    ).toBe(
      "role=COMPANY&status=APPROVED&archive=ALL&search=Empresa&order=NAME_ASC&page=2&pageSize=10",
    );
  });
});
