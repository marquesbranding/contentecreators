import { describe, expect, it, vi } from "vitest";

import type { BackofficeSubmissionReviewDto } from "../../types/submission-review.types";
import { createSubmissionReviewService } from "./submission-review.service";

const accountId = "b0000000-0000-4000-8000-000000000004";
const review = {
  account: {
    archivedAt: null,
    completion: { percentage: 100, version: 1 },
    id: accountId,
    operationalEmail: "creator@example.test",
    role: "INFLUENCER",
    status: "PENDING_REVIEW",
    submittedAt: "2026-07-28T12:00:00.000Z",
    version: 4,
  },
  consents: [],
  contactPreferences: null,
  media: [],
  moderation: {
    caseVersion: 2,
    currentSubmissionSequence: 1,
    history: [],
  },
  profile: {
    bio: "Conteúdo sobre tecnologia.",
    city: "São Paulo",
    creatorType: "INFLUENCER",
    displayName: "Creator Teste",
    legalName: "Creator Teste",
    niches: [],
    selfReportedMetrics: [],
    state: "SP",
    version: 2,
    whatsappE164: "+5511999999999",
  },
  role: "INFLUENCER",
  socialProfiles: [],
} satisfies BackofficeSubmissionReviewDto;

describe("submission review service", () => {
  it("loads one safe review DTO by account id", async () => {
    const repository = {
      findByAccountId: vi.fn().mockResolvedValue(review),
    };
    const service = createSubmissionReviewService({ repository });

    await expect(
      service.load({
        accountId,
        requestId: "review-request-id",
      }),
    ).resolves.toEqual(review);
    expect(repository.findByAccountId).toHaveBeenCalledWith({
      accountId,
      requestId: "review-request-id",
    });
  });

  it("rejects malformed direct identifiers before touching the repository", async () => {
    const repository = {
      findByAccountId: vi.fn(),
    };
    const service = createSubmissionReviewService({ repository });

    await expect(
      service.load({
        accountId: "../../another-account",
        requestId: "review-request-id",
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(repository.findByAccountId).not.toHaveBeenCalled();
  });
});
