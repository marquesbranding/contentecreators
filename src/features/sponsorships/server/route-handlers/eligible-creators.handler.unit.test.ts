import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  role: "ADMIN",
  find: vi.fn(),
  signed: vi.fn(),
}));
vi.mock("@/features/identity/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server")>();
  return {
    ...actual,
    createServerVerifiedAccountTransactionRunner:
      async () =>
      async (
        _context: unknown,
        work: (transaction: unknown, actor: unknown) => Promise<unknown>,
      ) =>
        work(
          {},
          {
            accountId: "a0000000-0000-4000-8000-000000000001",
            role: state.role,
            status: "APPROVED",
          },
        ),
  };
});
vi.mock("@/features/media/server", () => ({
  getServerSignedMedia: state.signed,
}));
vi.mock("../repositories/eligible-creators.repository", () => ({
  findEligibleCreators: state.find,
}));
import { getEligibleSponsorshipCreators } from "./eligible-creators.handler";
describe("eligible creator endpoint", () => {
  beforeEach(() => {
    state.role = "ADMIN";
    state.find.mockReset();
    state.signed.mockReset();
  });
  it("denies non-admin users before accessing creator data", async () => {
    state.role = "COMPANY";
    const response = await getEligibleSponsorshipCreators(
      new NextRequest("http://localhost/api/backoffice/sponsorships/creators"),
    );
    expect(response.status).toBe(403);
    expect(state.find).not.toHaveBeenCalled();
  });
  it("returns only authorized presentation fields with private no-store headers", async () => {
    state.find.mockResolvedValue([
      {
        id: "b0000000-0000-4000-8000-000000000004",
        displayName: "Diego Aprova",
        city: "Rio de Janeiro",
        state: "RJ",
        avatarAssetId: "private-id",
      },
    ]);
    state.signed.mockResolvedValue({ url: "https://example.com/avatar.png" });
    const response = await getEligibleSponsorshipCreators(
      new NextRequest(
        "http://localhost/api/backoffice/sponsorships/creators?search=Diego",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      items: [
        {
          id: "b0000000-0000-4000-8000-000000000004",
          displayName: "Diego Aprova",
          location: "Rio de Janeiro · RJ",
          avatarUrl: "https://example.com/avatar.png",
        },
      ],
    });
  });
  it("rejects oversized searches", async () => {
    const response = await getEligibleSponsorshipCreators(
      new NextRequest(
        `http://localhost/api/backoffice/sponsorships/creators?search=${"a".repeat(121)}`,
      ),
    );
    expect(response.status).toBe(422);
    expect(state.find).not.toHaveBeenCalled();
  });
});
