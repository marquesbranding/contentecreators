import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyCarouselItemDto } from "../../types/company-carousel.types";
import type { CompanyCarouselRepository } from "../repositories/company-carousel.repository";
import { createCompanyCarouselService } from "./company-carousel.service";

const eligibleItem: CompanyCarouselItemDto = {
  city: "Joaçaba",
  description: "Marca aberta a parcerias com creators locais.",
  displayName: "Marca Segura",
  email: "contato@marca.example",
  logo: {
    alt: "Logo da Marca Segura",
    assetId: "90000000-0000-4000-8000-000000000001",
  },
  segment: "Moda",
  state: "SC",
  websiteUrl: "https://marca.example/",
  whatsappE164: "+5549999999999",
};

type TestRole = "ADMIN" | "COMPANY" | "INFLUENCER" | null;
type TestStatus =
  | "APPROVED"
  | "BANNED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "SUSPENDED";

function createRunner(role: TestRole, status: TestStatus) {
  return vi.fn(async (_input, work) =>
    work({} as never, {
      accountId: "b0000000-0000-4000-8000-000000000004",
      authUserId: "20000000-0000-4000-8000-000000000004",
      role,
      status,
    }),
  ) as unknown as VerifiedAccountTransactionRunner;
}

function createRepository(items = [eligibleItem]): CompanyCarouselRepository {
  return {
    listEligibleCompanies: vi.fn(async () => items),
  };
}

describe("company carousel service", () => {
  it("returns only the bounded safe presentation DTO to an approved influencer", async () => {
    const repository = createRepository();
    const runVerifiedAccountTransaction = createRunner(
      "INFLUENCER",
      "APPROVED",
    );
    const service = createCompanyCarouselService({
      repository,
      runVerifiedAccountTransaction,
    });

    const result = await service.list(
      { limit: 500 },
      "company-carousel-request",
    );

    expect(result).toEqual({
      items: [eligibleItem],
      limit: 24,
    });
    expect(runVerifiedAccountTransaction).toHaveBeenCalledWith(
      { requestId: "company-carousel-request" },
      expect.any(Function),
    );
    expect(repository.listEligibleCompanies).toHaveBeenCalledWith(
      expect.anything(),
      24,
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(
      /cnpj|legalName|address|account|moderation|audit|operational/i,
    );
  });

  it("uses a documented default and clamps invalid or excessive limits", async () => {
    const repository = createRepository([]);
    const service = createCompanyCarouselService({
      repository,
      runVerifiedAccountTransaction: createRunner("INFLUENCER", "APPROVED"),
    });

    await expect(
      service.list({}, "default-limit-request"),
    ).resolves.toMatchObject({ limit: 12 });
    await expect(
      service.list({ limit: -4 }, "invalid-limit-request"),
    ).resolves.toMatchObject({ limit: 12 });
    await expect(
      service.list({ limit: 99 }, "maximum-limit-request"),
    ).resolves.toMatchObject({ limit: 24 });

    expect(repository.listEligibleCompanies).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      12,
    );
    expect(repository.listEligibleCompanies).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      12,
    );
    expect(repository.listEligibleCompanies).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      24,
    );
  });

  it("rejects a repository payload that attempts to add private fields", async () => {
    const repository = createRepository([
      {
        ...eligibleItem,
        cnpj: "12345678000195",
        operationalEmail: "private@example.test",
      } as CompanyCarouselItemDto,
    ]);
    const service = createCompanyCarouselService({
      repository,
      runVerifiedAccountTransaction: createRunner("INFLUENCER", "APPROVED"),
    });

    await expect(
      service.list({}, "unsafe-repository-payload"),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it.each(["COMPANY", "ADMIN", null] as const)(
    "denies an approved %s viewer before querying company data",
    async (role) => {
      const repository = createRepository();
      const service = createCompanyCarouselService({
        repository,
        runVerifiedAccountTransaction: createRunner(role, "APPROVED"),
      });

      await expect(
        service.list({}, `denied-role-${role ?? "roleless"}`),
      ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
      expect(repository.listEligibleCompanies).not.toHaveBeenCalled();
    },
  );

  it.each([
    "ONBOARDING",
    "PENDING_REVIEW",
    "CHANGES_REQUESTED",
    "SUSPENDED",
    "BANNED",
  ] as const)(
    "denies an influencer with %s status before querying company data",
    async (status) => {
      const repository = createRepository();
      const service = createCompanyCarouselService({
        repository,
        runVerifiedAccountTransaction: createRunner("INFLUENCER", status),
      });

      await expect(service.list({}, `denied-status-${status}`)).rejects.toEqual(
        new AccountAccessError("STATUS_FORBIDDEN"),
      );
      expect(repository.listEligibleCompanies).not.toHaveBeenCalled();
    },
  );

  it("returns no data when there is no verified authenticated identity", async () => {
    const repository = createRepository();
    const runVerifiedAccountTransaction = vi.fn(async () => {
      throw new VerifiedAccountTransactionError("UNAUTHENTICATED");
    }) as unknown as VerifiedAccountTransactionRunner;
    const service = createCompanyCarouselService({
      repository,
      runVerifiedAccountTransaction,
    });

    await expect(
      service.list({}, "anonymous-carousel-request"),
    ).rejects.toEqual(new VerifiedAccountTransactionError("UNAUTHENTICATED"));
    expect(repository.listEligibleCompanies).not.toHaveBeenCalled();
  });
});
