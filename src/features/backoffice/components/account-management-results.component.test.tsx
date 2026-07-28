import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AccountManagementResponseDto } from "../types/account-management.types";
import { AccountManagementResults } from "./account-management-results";

const response: AccountManagementResponseDto = {
  items: [
    {
      accountId: "c0000000-0000-4000-8000-000000000002",
      archivedAt: null,
      completionPercentage: 80,
      createdAt: "2026-07-25T12:00:00.000Z",
      displayName: "Empresa Dois",
      operationalEmail: "company-pending@contentecreators.test",
      role: "COMPANY",
      status: "PENDING_REVIEW",
      updatedAt: "2026-07-26T12:00:00.000Z",
      version: 2,
    },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

describe("AccountManagementResults", () => {
  it("renders equivalent desktop and mobile account controls", () => {
    render(<AccountManagementResults response={response} />);

    const table = screen.getByRole("region", {
      name: "Contas em tabela",
    });
    const cards = screen.getByRole("region", {
      name: "Contas em cartões",
    });

    expect(within(table).getByText("Empresa Dois")).toBeVisible();
    expect(within(cards).getByText("Empresa Dois")).toBeVisible();
    expect(
      within(table).getByRole("link", { name: "Abrir Empresa Dois" }),
    ).toHaveAttribute(
      "href",
      "/backoffice/accounts/c0000000-0000-4000-8000-000000000002",
    );
    expect(
      within(cards).getByRole("link", { name: "Abrir Empresa Dois" }),
    ).toHaveAttribute(
      "href",
      "/backoffice/accounts/c0000000-0000-4000-8000-000000000002",
    );
  });

  it("renders an actionable empty state", () => {
    render(
      <AccountManagementResults
        response={{
          items: [],
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 0,
            totalPages: 0,
          },
        }}
      />,
    );

    expect(screen.getByText("Nenhuma conta encontrada")).toBeVisible();
  });
});
