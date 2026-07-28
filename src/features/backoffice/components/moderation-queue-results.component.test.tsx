import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { ModerationQueueResponseDto } from "../types/moderation-queue.types";
import { ModerationQueueResults } from "./moderation-queue-results";

const queue: ModerationQueueResponseDto = {
  counts: {
    byRole: { COMPANY: 1, INFLUENCER: 1 },
    byStatus: {
      APPROVED: 0,
      BANNED: 0,
      CHANGES_REQUESTED: 1,
      PENDING_REVIEW: 1,
      SUSPENDED: 0,
    },
  },
  items: [
    {
      accountId: "10000000-0000-4000-8000-000000000001",
      accountVersion: 3,
      completionPercentage: 88,
      completionVersion: 1,
      displayName: "Criadora Teste",
      profileVersion: 2,
      role: "INFLUENCER",
      status: "PENDING_REVIEW",
      submittedAt: "2026-07-25T12:00:00.000Z",
    },
  ],
  pagination: {
    page: 2,
    pageSize: 20,
    totalItems: 41,
    totalPages: 3,
  },
};

describe("ModerationQueueResults", () => {
  it("renders equivalent desktop and mobile representations", () => {
    render(<ModerationQueueResults response={queue} />);

    const desktop = screen.getByLabelText(
      "Submissões para moderação em tabela",
    );
    const mobile = screen.getByLabelText(
      "Submissões para moderação em cartões",
    );

    for (const presentation of [desktop, mobile]) {
      expect(within(presentation).getByText("Criadora Teste")).toBeVisible();
      expect(within(presentation).getByText("Influenciador")).toBeVisible();
      expect(
        within(presentation).getByText("Aguardando análise"),
      ).toBeVisible();
      expect(within(presentation).getByText("88%")).toBeVisible();
      expect(
        within(presentation).getByRole("link", {
          name: "Revisar Criadora Teste",
        }),
      ).toHaveAttribute(
        "href",
        "/backoffice/moderation/10000000-0000-4000-8000-000000000001",
      );
    }

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/selecionar todos|aprovar selecionados/iu),
    ).not.toBeInTheDocument();
  });

  it("provides individual accessible pagination controls", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <ModerationQueueResults onPageChange={onPageChange} response={queue} />,
    );

    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    await user.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(screen.getByText("Página 2 de 3")).toBeVisible();
  });

  it("renders a clear first-empty state without controls for bulk actions", () => {
    render(
      <ModerationQueueResults
        response={{
          ...queue,
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

    expect(screen.getByText("Nenhum cadastro encontrado")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = render(<ModerationQueueResults response={queue} />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
