import { describe, expect, it, vi } from "vitest";

import type { ApplicationTransaction } from "@/db/client";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { GoogleProfileInput } from "../../schemas/onboarding-form-schema";
import {
  createCorrectedProfileResubmissionService,
  CorrectedProfileResubmissionError,
} from "./corrected-profile-resubmission.service";

const transaction = {} as ApplicationTransaction;
const creatorContext: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000003",
  authUserId: "20000000-0000-4000-8000-000000000003",
  role: "INFLUENCER",
  status: "CHANGES_REQUESTED",
};
const profile: GoogleProfileInput = {
  avatarAssetId: undefined,
  bio: "Perfil corrigido com informações suficientes para uma nova análise.",
  city: "Curitiba",
  contactVisibilityAccepted: false,
  coverAssetId: undefined,
  creatorType: "INFLUENCER",
  displayName: "Carla em Cena",
  engagementRate: 4.25,
  followers: 12_500,
  legalName: "Carla Exemplo",
  nicheSlugs: ["tecnologia"],
  privacyAccepted: true,
  role: "INFLUENCER",
  socialPlatform: "INSTAGRAM",
  socialUrl: "https://instagram.com/carla-em-cena",
  state: "PR",
  termsAccepted: true,
  whatsapp: "(41) 99999-9999",
};
const command = {
  expectedAccountVersion: 3,
  expectedProfileVersion: 5,
  idempotencyKey: "99000000-0000-4000-8000-000000000001",
};

function setup(context: VerifiedAccountContext = creatorContext) {
  const repository = {
    resubmit: vi.fn().mockResolvedValue({
      kind: "submitted" as const,
      outboxId: "e0000000-0000-4000-8000-000000000002",
    }),
  };
  const runVerifiedTransaction: VerifiedAccountTransactionRunner = async <T>(
    _request: { requestId: string },
    work: (
      currentTransaction: ApplicationTransaction,
      currentContext: VerifiedAccountContext,
    ) => Promise<T>,
  ) => work(transaction, context);
  const processOne = vi.fn().mockResolvedValue({ kind: "sent" as const });
  const service = createCorrectedProfileResubmissionService({
    emailDelivery: { processOne },
    repository,
    runVerifiedTransaction,
  });

  return { processOne, repository, runVerifiedTransaction, service };
}

describe("corrected profile resubmission service", () => {
  it("authorizes the owner and delegates one typed idempotent command", async () => {
    const { processOne, repository, service } = setup();

    await expect(
      service.resubmit({
        command,
        profile,
        requestId: "request-resubmit-corrections",
      }),
    ).resolves.toEqual({ kind: "submitted" });
    expect(repository.resubmit).toHaveBeenCalledWith(
      transaction,
      creatorContext,
      {
        command,
        profile,
        requestId: "request-resubmit-corrections",
      },
    );
    expect(processOne).toHaveBeenCalledWith({
      outboxId: "e0000000-0000-4000-8000-000000000002",
      workerId: expect.stringMatching(/^resubmission:/),
    });
  });

  it("rejects role tampering before touching persistence", async () => {
    const { repository, service } = setup({
      ...creatorContext,
      role: "COMPANY",
    });

    await expect(
      service.resubmit({
        command,
        profile,
        requestId: "request-role-tampering",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<CorrectedProfileResubmissionError>>({
        code: "ROLE_MISMATCH",
      }),
    );
    expect(repository.resubmit).not.toHaveBeenCalled();
  });

  it.each(["ONBOARDING", "APPROVED", "SUSPENDED", "BANNED"] as const)(
    "rejects a new resubmission from %s",
    async (status) => {
      const { repository, service } = setup({
        ...creatorContext,
        status,
      });

      await expect(
        service.resubmit({
          command,
          profile,
          requestId: `request-${status.toLowerCase()}`,
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<CorrectedProfileResubmissionError>>({
          code: "STATUS_FORBIDDEN",
        }),
      );
      expect(repository.resubmit).not.toHaveBeenCalled();
    },
  );

  it("allows a pending retry to reach repository idempotency handling", async () => {
    const { repository, service } = setup({
      ...creatorContext,
      status: "PENDING_REVIEW",
    });
    repository.resubmit.mockResolvedValueOnce({
      kind: "already_submitted",
    });

    await expect(
      service.resubmit({
        command,
        profile,
        requestId: "request-idempotent-retry",
      }),
    ).resolves.toEqual({ kind: "already_submitted" });
  });
});
