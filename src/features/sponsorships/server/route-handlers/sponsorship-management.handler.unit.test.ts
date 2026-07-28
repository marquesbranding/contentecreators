import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { SponsorshipManagementResponseDto } from "../../api/sponsorship-management.contract";
import { SponsorshipPlacementServiceError } from "../services/admin-sponsorship-placement.service";
import { createSponsorshipManagementRouteHandlers } from "./sponsorship-management.handler";

const emptyResponse: SponsorshipManagementResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

function createDependencies() {
  return {
    command: vi.fn(),
    create: vi.fn(),
    list: vi.fn(async () => emptyResponse),
    requestIdFactory: () => "generated-sponsorship-request",
    update: vi.fn(),
  };
}

describe("sponsorship management route handlers", () => {
  it("parses canonical list filters and returns private no-store data", async () => {
    const dependencies = createDependencies();
    const handlers = createSponsorshipManagementRouteHandlers(dependencies);
    const response = await handlers.GET(
      new NextRequest(
        "http://localhost/api/backoffice/sponsorships?type=TOP_BANNER&audience=COMPANY&page=2",
        { headers: { "x-request-id": "sponsor-list-test" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(dependencies.list).toHaveBeenCalledWith(
      {
        audience: "COMPANY",
        page: 2,
        pageSize: 20,
        search: "",
        type: "TOP_BANNER",
      },
      "sponsor-list-test",
    );
  });

  it("rejects unsafe creative links before reaching persistence", async () => {
    const dependencies = createDependencies();
    const handlers = createSponsorshipManagementRouteHandlers(dependencies);
    const response = await handlers.POST(
      new NextRequest("http://localhost/api/backoffice/sponsorships", {
        body: JSON.stringify({
          advertiserLabel: null,
          audience: "ALL",
          body: null,
          creativeAssetId: null,
          endsAt: null,
          featuredCreatorProfileId: null,
          isActive: false,
          linkLabel: "Abrir",
          linkUrl: "javascript:alert(1)",
          placementType: "TOP_BANNER",
          reason: "Cadastrar um rascunho seguro.",
          slotKey: "landing-top",
          sortOrder: 0,
          startsAt: null,
          title: "Rascunho",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    expect(dependencies.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      body: "{invalid-json",
      placementId: undefined,
      target: "POST",
    },
    {
      body: JSON.stringify({
        advertiserLabel: null,
        audience: "ALL",
        body: null,
        creativeAssetId: null,
        endsAt: null,
        featuredCreatorProfileId: null,
        isActive: false,
        linkLabel: null,
        linkUrl: null,
        placementType: "TOP_BANNER",
        price: 100,
        reason: "Cadastrar rascunho operacional.",
        slotKey: "landing-top",
        sortOrder: 0,
        startsAt: null,
        title: null,
      }),
      placementId: undefined,
      target: "POST",
    },
    {
      body: JSON.stringify({
        action: "REORDER",
        expectedVersion: 1,
        reason: "Reordenar exibição do placement.",
      }),
      placementId: "f6000000-0000-4000-8000-000000000002",
      target: "COMMAND",
    },
    {
      body: JSON.stringify({
        action: "DEACTIVATE",
        expectedVersion: 1,
        reason: "Desativar placement durante auditoria.",
      }),
      placementId: "not-a-uuid",
      target: "COMMAND",
    },
  ] as const)(
    "returns 422 without executing malformed direct mutation $target",
    async ({ body, placementId, target }) => {
      const dependencies = createDependencies();
      const handlers = createSponsorshipManagementRouteHandlers(dependencies);
      const request = new NextRequest(
        "http://localhost/api/backoffice/sponsorships",
        {
          body,
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const response =
        target === "POST"
          ? await handlers.POST(request)
          : await handlers.COMMAND(request, placementId!);

      expect(response.status).toBe(422);
      expect(dependencies.create).not.toHaveBeenCalled();
      expect(dependencies.command).not.toHaveBeenCalled();
    },
  );

  it("maps optimistic version conflicts to a safe 409 response", async () => {
    const dependencies = createDependencies();
    dependencies.command.mockRejectedValueOnce(
      new SponsorshipPlacementServiceError("VERSION_CONFLICT"),
    );
    const handlers = createSponsorshipManagementRouteHandlers(dependencies);
    const response = await handlers.COMMAND(
      new NextRequest("http://localhost/api/backoffice/sponsorships", {
        body: JSON.stringify({
          action: "DEACTIVATE",
          expectedVersion: 1,
          reason: "Desativar placement desatualizado.",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      "f6000000-0000-4000-8000-000000000002",
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "O placement foi alterado. Atualize os dados e tente novamente.",
    });
  });

  it("fails closed when an internal response contains an undeclared field", async () => {
    const dependencies = createDependencies();
    dependencies.list.mockResolvedValueOnce({
      ...emptyResponse,
      internalBillingReference: "must-not-leak",
    } as never);
    const handlers = createSponsorshipManagementRouteHandlers(dependencies);
    const response = await handlers.GET(
      new NextRequest("http://localhost/api/backoffice/sponsorships"),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("internalBillingReference");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ])(
    "maps authorization failures without leaking details",
    async (error, status) => {
      const dependencies = createDependencies();
      dependencies.list.mockRejectedValueOnce(error);
      const handlers = createSponsorshipManagementRouteHandlers(dependencies);
      const response = await handlers.GET(
        new NextRequest("http://localhost/api/backoffice/sponsorships"),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).not.toHaveProperty("error");
    },
  );
});
