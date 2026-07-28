import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { BackofficeSubmissionReviewDto } from "../types/submission-review.types";
import { SubmissionReview } from "./submission-review";

const common = {
  account: {
    archivedAt: null,
    completion: { percentage: 92, version: 1 },
    id: "10000000-0000-4000-8000-000000000001",
    operationalEmail: "contato@example.com",
    role: "INFLUENCER" as const,
    status: "PENDING_REVIEW" as const,
    submittedAt: "2026-07-25T12:00:00.000Z",
    version: 3,
  },
  consents: [
    {
      acceptedAt: "2026-07-25T11:00:00.000Z",
      contentHash: "abcdef1234567890",
      documentType: "PRIVACY" as const,
      isCurrent: true,
      versionLabel: "1.0",
    },
  ],
  contactPreferences: {
    emailVisibleToApprovedCompanies: true,
    socialVisibleToApprovedCompanies: true,
    version: 1,
    whatsappVisibleToApprovedCompanies: false,
  },
  media: [
    {
      height: 1080,
      id: "20000000-0000-4000-8000-000000000001",
      kind: "AVATAR" as const,
      mimeType: "image/webp",
      status: "ACTIVE" as const,
      version: 1,
      width: 1080,
    },
  ],
  moderation: {
    caseVersion: 2,
    currentSubmissionSequence: 1,
    history: [
      {
        action: "SUBMIT" as const,
        actorAccountId: "10000000-0000-4000-8000-000000000001",
        fromStatus: "ONBOARDING" as const,
        id: "30000000-0000-4000-8000-000000000001",
        occurredAt: "2026-07-25T12:00:00.000Z",
        reason: null,
        submissionSequence: 1,
        toStatus: "PENDING_REVIEW" as const,
      },
    ],
  },
  socialProfiles: [
    {
      handle: "@criadora",
      platform: "INSTAGRAM" as const,
      url: "https://instagram.com/criadora",
      version: 1,
    },
  ],
};

const influencerReview: BackofficeSubmissionReviewDto = {
  ...common,
  profile: {
    bio: "Conteúdo sobre moda e beleza.",
    city: "São Paulo",
    creatorType: "INFLUENCER",
    displayName: "Criadora Teste",
    legalName: "Criadora da Silva",
    niches: [{ name: "Moda", slug: "moda" }],
    selfReportedMetrics: [
      {
        engagementRate: "3.50",
        followerCount: 12000,
        observedOn: "2026-07-20",
        platform: "INSTAGRAM",
      },
    ],
    state: "SP",
    version: 2,
    whatsappE164: "+5511999999999",
  },
  role: "INFLUENCER",
};

const companyReview: BackofficeSubmissionReviewDto = {
  ...common,
  account: {
    ...common.account,
    role: "COMPANY",
  },
  cnpjAssistance: {
    disclaimer:
      "Os dados de CNPJ são apenas uma assistência editável e não verificam a legitimidade da empresa.",
    source: "USER_PROVIDED_EDITABLE_DATA",
  },
  profile: {
    cnpj: "11222333000181",
    description: "Marca nacional de vestuário.",
    employeeRange: "11-50",
    legalName: "Empresa Teste Ltda.",
    locations: [
      {
        city: "São Paulo",
        complement: null,
        isPrimary: true,
        label: "Sede",
        neighborhood: "Centro",
        number: "100",
        postalCode: "01001000",
        state: "SP",
        street: "Praça da Sé",
      },
    ],
    segment: "Moda",
    tradeName: "Empresa Teste",
    version: 4,
    websiteUrl: "https://example.com",
    whatsappE164: "+5511888888888",
  },
  role: "COMPANY",
};

describe("SubmissionReview", () => {
  it("shows all decision data for an influencer without auth secrets", async () => {
    const { container } = render(
      <SubmissionReview review={influencerReview} />,
    );

    expect(
      screen.getByRole("heading", { name: "Criadora Teste" }),
    ).toBeVisible();
    expect(screen.getAllByText("Influenciador")).not.toHaveLength(0);
    expect(screen.getByText("Criadora da Silva")).toBeVisible();
    expect(screen.getByText("Moda")).toBeVisible();
    expect(screen.getByText("12.000 seguidores")).toBeVisible();
    expect(screen.getByText("Métrica autodeclarada")).toBeVisible();
    expect(screen.getByText("contato@example.com")).toBeVisible();
    expect(screen.getByRole("link", { name: /@criadora/iu })).toBeVisible();
    expect(screen.getByText("Foto de perfil")).toBeVisible();
    expect(screen.getByText("Privacidade — versão 1.0")).toBeVisible();
    expect(screen.getByText("Envio para análise")).toBeVisible();
    expect(container).not.toHaveTextContent(/authUserId|token|password/iu);
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("shows company location and the CNPJ assistance disclaimer", async () => {
    const { container } = render(<SubmissionReview review={companyReview} />);

    expect(
      screen.getByRole("heading", { name: "Empresa Teste" }),
    ).toBeVisible();
    expect(screen.getByText("11.222.333/0001-81")).toBeVisible();
    expect(screen.getByText("Praça da Sé, 100")).toBeVisible();
    expect(
      screen.getByText(/não verificam a legitimidade da empresa/iu),
    ).toBeVisible();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
