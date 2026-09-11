import { afterEach, describe, expect, it, vi } from "vitest";

import { applyVerifiedAuditContext } from "@/features/audit/server";
import { AccountAccessError } from "@/features/identity/server";

import type { LandingShowcaseManagementResponseDto } from "../../api/landing-showcase-management.contract";
import {
  LandingShowcaseRepositoryError,
  type LandingShowcaseRepository,
} from "../repositories/landing-showcase.repository";
import {
  createAdminLandingShowcaseService,
  LandingShowcaseServiceError,
} from "./admin-landing-showcase.service";

vi.mock("@/features/audit/server", () => ({
  applyVerifiedAuditContext: vi.fn(async () => undefined),
}));

const adminActor = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  role: "ADMIN",
  status: "APPROVED",
};

const lists: LandingShowcaseManagementResponseDto = {
  companies: [],
  creators: [],
};

const command = {
  action: "ENABLE",
  expectedVersion: 2,
  kind: "COMPANY",
  profileId: "e0000000-0000-4000-8000-000000000004",
} as const;

function createService({
  actor = adminActor,
  repository = {
    applyCommand: vi.fn(async () => undefined),
    listCandidates: vi.fn(async () => lists),
  },
}: {
  actor?: typeof adminActor;
  repository?: LandingShowcaseRepository;
} = {}) {
  const transaction = {};
  const runVerifiedTransaction = vi.fn(
    async (
      _options: { requestId: string },
      work: (transaction: never, actor: never) => Promise<unknown>,
    ) => work(transaction as never, actor as never),
  );
  const service = createAdminLandingShowcaseService({
    repository,
    runVerifiedTransaction: runVerifiedTransaction as never,
  });

  return { repository, service, transaction };
}

describe("admin landing showcase service", () => {
  afterEach(() => {
    vi.mocked(applyVerifiedAuditContext).mockClear();
  });

  it("refuses to list candidates for a non-admin actor", async () => {
    const { repository, service } = createService({
      actor: { ...adminActor, role: "INFLUENCER" },
    });

    await expect(service.list("request-1")).rejects.toBeInstanceOf(
      AccountAccessError,
    );
    expect(repository.listCandidates).not.toHaveBeenCalled();
  });

  it("audits the change as a backoffice admin action before writing", async () => {
    const { repository, service, transaction } = createService();

    await expect(service.command(command, "request-2")).resolves.toEqual(lists);

    expect(applyVerifiedAuditContext).toHaveBeenCalledWith(transaction, {
      actorAccountId: adminActor.accountId,
      actorRole: "ADMIN",
      actorType: "ADMIN",
      reason: "Empresa incluída na vitrine da landing page.",
      requestId: "request-2",
      source: "BACKOFFICE",
    });
    expect(repository.applyCommand).toHaveBeenCalledWith(transaction, command);
    expect(
      vi.mocked(applyVerifiedAuditContext).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(repository.applyCommand).mock.invocationCallOrder[0]!,
    );
  });

  it("rejects a non-admin command before auditing or writing", async () => {
    const { repository, service } = createService({
      actor: { ...adminActor, role: "COMPANY" },
    });

    await expect(service.command(command, "request-3")).rejects.toBeInstanceOf(
      AccountAccessError,
    );
    expect(applyVerifiedAuditContext).not.toHaveBeenCalled();
    expect(repository.applyCommand).not.toHaveBeenCalled();
  });

  it("surfaces repository conflicts as service errors", async () => {
    const { service } = createService({
      repository: {
        applyCommand: vi.fn(async () => {
          throw new LandingShowcaseRepositoryError("VERSION_CONFLICT");
        }),
        listCandidates: vi.fn(async () => lists),
      },
    });

    await expect(service.command(command, "request-4")).rejects.toEqual(
      new LandingShowcaseServiceError("VERSION_CONFLICT"),
    );
  });
});
