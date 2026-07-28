import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import type {
  BackofficeAnalyticsFilters,
  BackofficeAnalyticsResponseDto,
} from "../types/backoffice-analytics.types";
import { BackofficeAnalyticsDashboard } from "./backoffice-analytics-dashboard.client";

const filters: BackofficeAnalyticsFilters = { periodDays: 30 };

const data: BackofficeAnalyticsResponseDto = {
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 12,
        BANNED: 1,
        CHANGES_REQUESTED: 2,
        ONBOARDING: 3,
        PENDING_REVIEW: 4,
        SUSPENDED: 1,
      },
      total: 23,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 30,
        BANNED: 1,
        CHANGES_REQUESTED: 3,
        ONBOARDING: 8,
        PENDING_REVIEW: 5,
        SUSPENDED: 2,
      },
      total: 49,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 18,
    percentage: 76,
    totalProfiles: 72,
  },
  newRegistrations: {
    byRole: { COMPANY: 3, INFLUENCER: 7 },
    total: 10,
  },
  period: {
    days: 30,
    endsAtExclusive: "2026-07-29T03:00:00.000Z",
    fromDate: "2026-06-29",
    startsAt: "2026-06-29T03:00:00.000Z",
    throughDate: "2026-07-28",
    timeZone: "America/Sao_Paulo",
  },
  totals: {
    awaitingApproval: 9,
    companies: 23,
    influencers: 49,
  },
};

const emptyData: BackofficeAnalyticsResponseDto = {
  ...data,
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 0,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 0,
        SUSPENDED: 0,
      },
      total: 0,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 0,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 0,
        SUSPENDED: 0,
      },
      total: 0,
    },
  },
  completion: {
    ...data.completion,
    completedProfiles: 0,
    percentage: 0,
    totalProfiles: 0,
  },
  newRegistrations: {
    byRole: { COMPANY: 0, INFLUENCER: 0 },
    total: 0,
  },
  totals: {
    awaitingApproval: 0,
    companies: 0,
    influencers: 0,
  },
};

describe("BackofficeAnalyticsDashboard", () => {
  it("renders actionable summaries, role/status breakdown and queue links", () => {
    const { container } = render(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Visão geral" }),
    ).toBeInTheDocument();
    expect(screen.getByText("49")).toBeVisible();
    expect(screen.getByText("23")).toBeVisible();
    expect(screen.getByText("76%")).toBeVisible();
    expect(screen.getAllByText("Aguardando análise")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /Fila de influenciadores/i }),
    ).toHaveAttribute(
      "href",
      "/backoffice/moderation?role=INFLUENCER&status=PENDING_REVIEW",
    );
    expect(
      screen.getByRole("link", { name: /Fila de empresas/i }),
    ).toHaveAttribute(
      "href",
      "/backoffice/moderation?role=COMPANY&status=PENDING_REVIEW",
    );
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
  });

  it("owns the selected registration period through its filter callback", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={onFiltersChange}
        query={{ data, status: "success" }}
      />,
    );

    await user.click(screen.getByLabelText("Período de novos cadastros"));
    await user.click(
      await screen.findByRole("option", { name: "Últimos 7 dias" }),
    );

    expect(onFiltersChange).toHaveBeenCalledWith({ periodDays: 7 });
  });

  it("renders accessible loading, empty and recoverable error states", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ status: "loading" }}
      />,
    );

    expect(screen.getByText("Carregando indicadores")).toBeInTheDocument();

    rerender(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ data: emptyData, status: "success" }}
      />,
    );
    expect(screen.getByText("Ainda não há dados operacionais")).toBeVisible();

    rerender(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ retry, status: "error" }}
      />,
    );
    expect(
      screen.getByText("Não foi possível carregar os indicadores"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("has no automated accessibility violations at the 320px layout", async () => {
    globalThis.innerWidth = 320;
    globalThis.dispatchEvent(new Event("resize"));
    const { container } = render(
      <BackofficeAnalyticsDashboard
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    expect(container.querySelector(".grid-cols-1")).toBeInTheDocument();
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
