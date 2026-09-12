import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  LandingShowcaseCandidateDto,
  LandingShowcaseManagementResponseDto,
} from "../api/landing-showcase-management.contract";
import { LandingShowcaseManagementView } from "./landing-showcase-management-view.client";

function creator(
  overrides: Partial<LandingShowcaseCandidateDto>,
): LandingShowcaseCandidateDto {
  return {
    city: "Joaçaba",
    creatorType: "INFLUENCER",
    displayName: "Creator",
    enabled: false,
    kind: "CREATOR",
    position: null,
    profileId: "d0000000-0000-4000-8000-000000000001",
    segment: null,
    state: "SC",
    version: 1,
    ...overrides,
  };
}

const data: LandingShowcaseManagementResponseDto = {
  companies: [
    {
      city: "São Paulo",
      creatorType: null,
      displayName: "Empresa Quatro",
      enabled: false,
      kind: "COMPANY",
      position: null,
      profileId: "e0000000-0000-4000-8000-000000000004",
      segment: "Alimentação",
      state: "SP",
      version: 5,
    },
  ],
  creators: [
    creator({
      displayName: "Gabi Conecta",
      enabled: true,
      position: 0,
      profileId: "d0000000-0000-4000-8000-000000000007",
      version: 3,
    }),
    creator({
      displayName: "Diego Aprova",
      enabled: true,
      position: 1,
      profileId: "d0000000-0000-4000-8000-000000000004",
    }),
    creator({
      creatorType: "UGC",
      displayName: "Júlia Criadora",
      profileId: "d0000000-0000-4000-8000-000000000018",
      version: 2,
    }),
  ],
};

function renderView(
  overrides: Partial<Parameters<typeof LandingShowcaseManagementView>[0]> = {},
) {
  const onCommand = vi.fn(async () => undefined);

  render(
    <LandingShowcaseManagementView
      data={data}
      hasError={false}
      isLoading={false}
      onCommand={onCommand}
      pending={false}
      {...overrides}
    />,
  );

  return { onCommand };
}

describe("LandingShowcaseManagementView", () => {
  it("lists enabled creators in carousel order and keeps the ends immovable", () => {
    renderView();

    const enabledList = screen.getByRole("region", {
      name: "Influenciadores e UGCs — na landing",
    });
    const rows = within(enabledList).getAllByTestId(
      "landing-showcase-candidate",
    );

    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Gabi Conecta"),
      expect.stringContaining("Diego Aprova"),
    ]);
    expect(
      screen.getByRole("button", {
        name: "Mover Gabi Conecta para antes no carrossel",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Mover Diego Aprova para depois no carrossel",
      }),
    ).toBeDisabled();
  });

  it("sends the profile version with every command", async () => {
    const user = userEvent.setup();
    const { onCommand } = renderView();

    await user.click(
      screen.getByRole("button", { name: "Exibir Júlia Criadora na landing" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Exibir Empresa Quatro na landing" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Não exibir Gabi Conecta na landing",
      }),
    );

    expect(onCommand).toHaveBeenNthCalledWith(1, {
      action: "ENABLE",
      expectedVersion: 2,
      kind: "CREATOR",
      profileId: "d0000000-0000-4000-8000-000000000018",
    });
    expect(onCommand).toHaveBeenNthCalledWith(2, {
      action: "ENABLE",
      expectedVersion: 5,
      kind: "COMPANY",
      profileId: "e0000000-0000-4000-8000-000000000004",
    });
    expect(onCommand).toHaveBeenNthCalledWith(3, {
      action: "DISABLE",
      expectedVersion: 3,
      kind: "CREATOR",
      profileId: "d0000000-0000-4000-8000-000000000007",
    });
  });

  it("offers both choices on every row and marks the current one", () => {
    renderView();

    const enabledShow = screen.getByRole("button", {
      name: "Exibir Gabi Conecta na landing",
    });
    const enabledHide = screen.getByRole("button", {
      name: "Não exibir Gabi Conecta na landing",
    });

    expect(enabledShow).toHaveAttribute("aria-pressed", "true");
    expect(enabledShow).toBeDisabled();
    expect(enabledHide).toHaveAttribute("aria-pressed", "false");
    expect(enabledHide).toBeEnabled();

    const availableShow = screen.getByRole("button", {
      name: "Exibir Júlia Criadora na landing",
    });
    const availableHide = screen.getByRole("button", {
      name: "Não exibir Júlia Criadora na landing",
    });

    expect(availableShow).toBeEnabled();
    expect(availableHide).toHaveAttribute("aria-pressed", "true");
    expect(availableHide).toBeDisabled();
  });

  it("filters the available creators by name", async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar creator disponível" }),
      "zzz",
    );

    expect(
      screen.getByText("Nenhum perfil encontrado para essa busca."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Exibir Júlia Criadora na landing",
      }),
    ).not.toBeInTheDocument();
  });

  it("blocks every action while a command is in flight", () => {
    renderView({ pending: true });

    expect(
      screen.getByRole("button", { name: "Exibir Empresa Quatro na landing" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Não exibir Gabi Conecta na landing",
      }),
    ).toBeDisabled();
  });

  it("explains a load failure instead of showing empty lists", () => {
    renderView({ data: undefined, hasError: true });

    expect(
      screen.getByText("Não foi possível carregar os perfis."),
    ).toBeVisible();
    expect(
      screen.queryByTestId("landing-showcase-candidate"),
    ).not.toBeInTheDocument();
  });
});
