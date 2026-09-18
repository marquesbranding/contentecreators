import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import type { MediaUploadActions } from "@/features/media";

import type {
  SponsorshipManagementFilters,
  SponsorshipManagementResponseDto,
} from "../api/sponsorship-management.contract";
import { SponsorshipManagementView } from "./sponsorship-management-view.client";

const mediaActions: MediaUploadActions = {
  activate: vi.fn(),
  finalize: vi.fn(),
  prepare: vi.fn(),
};

const filters: SponsorshipManagementFilters = {
  page: 1,
  pageSize: 20,
  search: "",
};

const data: SponsorshipManagementResponseDto = {
  items: [
    {
      activationIssues: [],
      advertiserLabel: "Marca parceira",
      archivedAt: null,
      audience: "COMPANY",
      body: "Uma oportunidade preparada para empresas.",
      creative: null,
      creativeAssetId: null,
      creativeAssetMobileId: null,
      creativeAssetTabletId: null,
      creativeMobile: null,
      creativeTablet: null,
      endsAt: null,
      featuredCreatorName: null,
      featuredCreatorProfileId: null,
      id: "f6000000-0000-4000-8000-000000000002",
      isActive: false,
      linkOnCreative: false,
      showSponsoredBadge: true,
      showAdvertiserLabel: true,
      textColor: null,
      buttonBackgroundColor: null,
      buttonTextColor: null,
      fontFamily: null,
      imageAlt: null,
      linkLabel: "Conhecer oportunidade",
      linkUrl: "https://example.com",
      placementType: "TOP_BANNER",
      slotKey: "catalog-top",
      sortOrder: 20,
      startsAt: null,
      state: "DRAFT",
      title: "Banner em rascunho",
      updatedAt: "2026-07-28T12:00:00.000Z",
      version: 1,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
};

describe("SponsorshipManagementView", () => {
  it("renders equivalent management content and opens preview", async () => {
    const user = userEvent.setup();

    render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    expect(screen.getAllByText("Banner em rascunho").length).toBeGreaterThan(1);
    await user.click(screen.getAllByRole("button", { name: "Visualizar" })[0]);
    expect(
      screen.getByRole("heading", { name: "Prévia do patrocínio" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("Prévia do patrocínio no site"),
    ).toBeInTheDocument();
  });

  it("saves an incomplete draft without requesting a reason", async () => {
    const user = userEvent.setup();
    const create = vi.fn();

    render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{ command: vi.fn(), create, update: vi.fn() }}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Novo patrocínio" }));
    expect(screen.getByText("Campos obrigatórios")).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(
      screen.queryByLabelText("Motivo da alteração"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: null,
        reason: "",
        slotKey: "catalog-top",
        isActive: false,
      }),
    );
  });

  it("presents persisted UTC dates as local datetime values while editing", async () => {
    const user = userEvent.setup();
    const startsAt = "2026-08-05T18:30:00.000Z";
    const expectedLocalValue = "2026-08-05T15:30";

    render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{
          data: {
            ...data,
            items: [{ ...data.items[0], startsAt }],
          },
          status: "success",
        }}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);

    await user.click(screen.getByRole("button", { name: /Público e agenda/ }));
    expect(screen.getByLabelText("Início (opcional)")).toHaveValue(
      expectedLocalValue,
    );
  });

  it("shows loading, empty and recoverable error states", async () => {
    const { rerender } = render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ status: "loading" }}
      />,
    );
    expect(screen.getByText("Carregando patrocínios")).toBeInTheDocument();

    rerender(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ data: { ...data, items: [] }, status: "success" }}
      />,
    );
    expect(screen.getByText("Nenhum patrocínio encontrado")).toBeVisible();

    rerender(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ retry: vi.fn(), status: "error" }}
      />,
    );
    expect(
      screen.getByText("Não foi possível carregar os patrocínios"),
    ).toBeVisible();
  });

  it("owns search and pagination through canonical filter callbacks", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={onFiltersChange}
        query={{
          data: {
            ...data,
            pagination: {
              page: 1,
              pageSize: 20,
              totalItems: 21,
              totalPages: 2,
            },
          },
          status: "success",
        }}
      />,
    );

    await user.type(screen.getByLabelText("Buscar patrocínio"), "Banner");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(onFiltersChange).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: "Banner",
    });

    await user.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(onFiltersChange).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: "",
    });
  });

  it("has no automated accessibility violations in the responsive management view", async () => {
    const { container } = render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("has no automated accessibility violations in the placement form dialog", async () => {
    const user = userEvent.setup();

    render(
      <SponsorshipManagementView
        filters={filters}
        mediaActions={mediaActions}
        mutations={{
          command: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }}
        onFiltersChange={vi.fn()}
        query={{ data, status: "success" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Novo patrocínio" }));

    // jsdom does not expose real iframe windows; the browser suite checks the preview.
    const results = await axe.run(document.body, { iframes: false });
    expect(results.violations).toEqual([]);
  });
});
