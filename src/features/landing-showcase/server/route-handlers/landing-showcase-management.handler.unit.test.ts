import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { LandingShowcaseManagementResponseDto } from "../../api/landing-showcase-management.contract";
import { LandingShowcaseServiceError } from "../services/admin-landing-showcase.service";
import { createLandingShowcaseManagementRouteHandlers } from "./landing-showcase-management.handler";

const profileId = "d0000000-0000-4000-8000-000000000007";

const lists: LandingShowcaseManagementResponseDto = {
  companies: [],
  creators: [
    {
      city: "Joaçaba",
      creatorType: "UGC",
      displayName: "Gabi Conecta",
      enabled: true,
      kind: "CREATOR",
      position: 0,
      profileId,
      segment: null,
      state: "SC",
      version: 3,
    },
  ],
};

const validCommand = {
  action: "ENABLE",
  expectedVersion: 3,
  kind: "CREATOR",
  profileId,
};

function createDependencies() {
  return {
    command: vi.fn(async () => lists),
    list: vi.fn(async () => lists),
    requestIdFactory: () => "generated-landing-request",
  };
}

function postRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/backoffice/landing-showcase", {
    body,
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

describe("landing showcase management route handlers", () => {
  it("returns both candidate lists as private, uncached data", async () => {
    const dependencies = createDependencies();
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).GET(
      new NextRequest("http://localhost/api/backoffice/landing-showcase", {
        headers: { "x-request-id": "landing-list-test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("landing-list-test");
    await expect(response.json()).resolves.toEqual(lists);
    expect(dependencies.list).toHaveBeenCalledWith("landing-list-test");
  });

  it("rejects a cross-origin command before reading its body", async () => {
    const dependencies = {
      ...createDependencies(),
      verifySameOrigin: vi.fn(() => ({
        allowed: false as const,
        reason: "ORIGIN_MISMATCH",
      })),
    };
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).POST(postRequest(JSON.stringify(validCommand)));

    expect(response.status).toBe(403);
    expect(dependencies.command).not.toHaveBeenCalled();
  });

  it("throttles administrative commands", async () => {
    const dependencies = {
      ...createDependencies(),
      consumeAdminCapacity: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 30,
      })),
    };
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).POST(postRequest(JSON.stringify(validCommand)));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(dependencies.command).not.toHaveBeenCalled();
  });

  it.each([
    ["a malformed body", "{not json"],
    ["an unknown action", JSON.stringify({ ...validCommand, action: "PIN" })],
    [
      "an undeclared field",
      JSON.stringify({ ...validCommand, isFeatured: true }),
    ],
    [
      "a non-uuid profile",
      JSON.stringify({ ...validCommand, profileId: "../admin" }),
    ],
  ])("refuses %s without touching the service", async (_case, body) => {
    const dependencies = createDependencies();
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).POST(postRequest(body));

    expect(response.status).toBe(422);
    expect(dependencies.command).not.toHaveBeenCalled();
  });

  it("applies a valid command and answers with the refreshed lists", async () => {
    const dependencies = createDependencies();
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).POST(
      postRequest(JSON.stringify(validCommand), {
        "x-request-id": "landing-command-test",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(lists);
    expect(dependencies.command).toHaveBeenCalledWith(
      validCommand,
      "landing-command-test",
    );
  });

  it.each([
    [new LandingShowcaseServiceError("VERSION_CONFLICT"), 409],
    [new LandingShowcaseServiceError("NOT_FOUND"), 404],
    [new LandingShowcaseServiceError("NOT_ENABLED"), 422],
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ])("maps %s to HTTP %i", async (error, status) => {
    const dependencies = {
      ...createDependencies(),
      command: vi.fn(async () => {
        throw error;
      }),
    };
    const response = await createLandingShowcaseManagementRouteHandlers(
      dependencies,
    ).POST(postRequest(JSON.stringify(validCommand)));

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
