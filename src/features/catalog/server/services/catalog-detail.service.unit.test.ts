import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CatalogCreatorDetailRecord } from "../repositories/catalog-detail.repository";
import { createCatalogDetailService } from "./catalog-detail.service";

const creatorId = "20000000-0000-4000-8000-000000000002";
const requestId = "catalog-detail-request";
const record: CatalogCreatorDetailRecord = {
  avatarAssetId: null,
  bio: "Creator sintética com perfil completo para apresentação.",
  city: "Recife",
  contact: null,
  coverAssetId: null,
  creatorId,
  creatorType: "UGC",
  displayName: "Creator UGC",
  media: [],
  metrics: [],
  niches: [],
  socialProfiles: [],
  state: "PE",
};

function createRunner(
  role: "ADMIN" | "COMPANY" | "INFLUENCER" = "COMPANY",
  status:
    | "APPROVED"
    | "BANNED"
    | "CHANGES_REQUESTED"
    | "ONBOARDING"
    | "PENDING_REVIEW"
    | "SUSPENDED" = "APPROVED",
) {
  return (async (_input, work) =>
    work({} as Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0], {
      accountId: "10000000-0000-4000-8000-000000000001",
      authUserId: "30000000-0000-4000-8000-000000000003",
      role,
      status,
    })) satisfies VerifiedAccountTransactionRunner;
}

describe("catalog detail service", () => {
  it("reauthorizes an approved viewer in the transaction before loading and mapping", async () => {
    const findEligibleCreator = vi.fn().mockResolvedValue(record);
    const service = createCatalogDetailService({
      findEligibleCreator,
      runVerifiedAccountTransaction: createRunner(),
    });

    await expect(service.load({ creatorId, requestId })).resolves.toMatchObject(
      {
        creatorId,
        displayName: "Creator UGC",
      },
    );
    expect(findEligibleCreator).toHaveBeenCalledWith(
      expect.anything(),
      creatorId,
      {
        accountId: "10000000-0000-4000-8000-000000000001",
        role: "COMPANY",
      },
    );
  });

  it("returns null for an unavailable, incomplete, suspended or archived creator", async () => {
    const findEligibleCreator = vi.fn().mockResolvedValue(null);
    const service = createCatalogDetailService({
      findEligibleCreator,
      runVerifiedAccountTransaction: createRunner(),
    });

    await expect(service.load({ creatorId, requestId })).resolves.toBeNull();
  });

  it.each([
    "ONBOARDING",
    "PENDING_REVIEW",
    "CHANGES_REQUESTED",
    "SUSPENDED",
    "BANNED",
  ] as const)(
    "denies a %s viewer without repository access",
    async (status) => {
      const findEligibleCreator = vi.fn();
      const service = createCatalogDetailService({
        findEligibleCreator,
        runVerifiedAccountTransaction: createRunner("COMPANY", status),
      });

      await expect(
        service.load({ creatorId, requestId }),
      ).rejects.toBeInstanceOf(AccountAccessError);
      expect(findEligibleCreator).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed identifiers before starting a transaction", async () => {
    const findEligibleCreator = vi.fn();
    const runVerifiedAccountTransaction = vi.fn();
    const service = createCatalogDetailService({
      findEligibleCreator,
      runVerifiedAccountTransaction:
        runVerifiedAccountTransaction as unknown as VerifiedAccountTransactionRunner,
    });

    await expect(
      service.load({ creatorId: "unsafe", requestId: "short" }),
    ).rejects.toThrow();
    expect(runVerifiedAccountTransaction).not.toHaveBeenCalled();
  });
});
