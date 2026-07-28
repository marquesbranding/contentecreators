import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BackofficeAccountDetailDto } from "../types/account-detail.types";
import { AccountDetail } from "./account-detail";

const detail: BackofficeAccountDetailDto = {
  account: {
    approvedAt: null,
    archivedAt: null,
    bannedAt: null,
    completion: { percentage: 80, version: 1 },
    createdAt: "2026-07-20T12:00:00.000Z",
    id: "c0000000-0000-4000-8000-000000000002",
    operationalEmail: "company-pending@contentecreators.test",
    role: "COMPANY",
    status: "PENDING_REVIEW",
    submittedAt: "2026-07-25T12:00:00.000Z",
    suspendedAt: null,
    updatedAt: "2026-07-25T12:00:00.000Z",
    version: 2,
  },
  consents: [
    {
      acceptedAt: "2026-07-25T12:00:00.000Z",
      contentHash: "a".repeat(64),
      documentType: "TERMS",
      isCurrent: true,
      versionLabel: "LOCAL-PLACEHOLDER-v1",
    },
  ],
  contactPreferences: null,
  media: [],
  moderation: {
    assignedAdminAccountId: null,
    caseVersion: 1,
    currentSubmissionSequence: 1,
    history: [],
    resolvedAt: null,
    submittedAt: "2026-07-25T12:00:00.000Z",
  },
  profile: {
    editableProfile: {
      additionalLocations: [],
      city: "São Paulo",
      cnpj: "12345678000276",
      complement: "",
      coverAssetId: null,
      description: "Empresa sintética aguardando análise.",
      employeeRange: "11_TO_50",
      legalName: "Empresa Dois Exemplo Ltda",
      logoAssetId: null,
      neighborhood: "Centro",
      number: "002",
      postalCode: "01001000",
      segment: "Tecnologia",
      state: "SP",
      street: "Rua de Teste",
      tradeName: "Empresa Dois",
      version: 1,
      whatsapp: "+5511999999999",
    },
    kind: "COMPANY",
  },
  socialProfiles: [],
};

describe("AccountDetail", () => {
  it("shows profile, status, completion and operational evidence", () => {
    render(<AccountDetail detail={detail} />);

    expect(screen.getByRole("heading", { name: "Empresa Dois" })).toBeVisible();
    expect(screen.getByText("Aguardando análise")).toBeVisible();
    expect(screen.getByText("80%")).toBeVisible();
    expect(screen.getByText("12.345.678/0002-76")).toBeVisible();
    expect(screen.getByText("Consentimentos")).toBeVisible();
    expect(screen.getByText("Histórico de moderação")).toBeVisible();
    expect(screen.getByText("Metadados operacionais")).toBeVisible();
  });

  it("does not render private infrastructure metadata", () => {
    const { container } = render(<AccountDetail detail={detail} />);

    expect(container.textContent).not.toMatch(
      /authUserId|objectPath|bucketName|networkKeyHash|userAgentHash|signedUrl/i,
    );
  });
});
