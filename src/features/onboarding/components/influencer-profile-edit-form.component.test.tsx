import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type {
  InfluencerProfileAction,
  InfluencerProfileDto,
} from "../types/influencer-profile.types";
import { InfluencerProfileEditForm } from "./influencer-profile-edit-form.client";

vi.mock("../hooks/use-cnpj-lookup", () => ({
  useCnpjLookup: () => ({
    data: undefined,
    lookupStatus: "idle",
    refetch: vi.fn(),
  }),
}));

const profile = {
  avatarAssetId: null,
  bio: "Crio conteúdo autoral de tecnologia e produtividade para a internet.",
  city: "São Paulo",
  coverAssetId: null,
  creatorType: "INFLUENCER",
  displayName: "Joana Cria",
  engagementRate: 4.25,
  followers: 12_500,
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia"],
  socialPlatform: "INSTAGRAM",
  socialUrl: "https://instagram.com/joanacria",
  state: "SP",
  version: 3,
  whatsapp: "+5511999999999",
} satisfies InfluencerProfileDto;

describe("InfluencerProfileEditForm", () => {
  it("restores approved data without requesting registration consents", () => {
    render(
      <InfluencerProfileEditForm
        action={vi.fn()}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );

    expect(screen.getByLabelText("Nome de creator")).toHaveValue("Joana Cria");
    expect(screen.getByLabelText("Tipo de atuação")).toHaveTextContent(
      "Influencer",
    );
    expect(screen.queryByText("Termos e privacidade")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeEnabled();
  });

  it("highlights required fields before dispatching the action", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <InfluencerProfileEditForm
        action={action}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );

    await user.clear(screen.getByLabelText("Nome de creator"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome de creator")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Corrija os campos abaixo")).toBeInTheDocument();
  });

  it("shows success and publishes the returned optimistic version", async () => {
    const user = userEvent.setup();
    const onProfileVersionChange = vi.fn();
    const action = vi.fn(async () => ({
      message: "Perfil atualizado com sucesso.",
      profileVersion: 4,
      status: "success" as const,
    })) satisfies InfluencerProfileAction;
    render(
      <InfluencerProfileEditForm
        action={action}
        expectedVersion={profile.version}
        onProfileVersionChange={onProfileVersionChange}
        profile={profile}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText("Perfil atualizado com sucesso."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(onProfileVersionChange).toHaveBeenCalledWith(4);
    });
  });

  it("keeps the 320 px composition single-column and accessible", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    const { container } = render(
      <InfluencerProfileEditForm
        action={vi.fn()}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );
    const responsiveGrids = container.querySelectorAll(
      ".md\\:grid-cols-2, .sm\\:grid-cols-2",
    );

    expect(
      screen.getByRole("form", { name: "Editar perfil de creator" }),
    ).toBeVisible();
    expect(responsiveGrids.length).toBeGreaterThan(0);
    for (const grid of responsiveGrids) {
      expect(grid).not.toHaveClass("grid-cols-2");
    }
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("supports keyboard traversal and selection without pointer input", async () => {
    const user = userEvent.setup();
    render(
      <InfluencerProfileEditForm
        action={vi.fn()}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );

    await user.tab();
    expect(screen.getByLabelText("Nome completo")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Nome de creator")).toHaveFocus();
    await user.tab();
    const creatorType = screen.getByLabelText("Tipo de atuação");
    expect(creatorType).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("option", { name: "Creator UGC" }),
    ).toBeVisible();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(creatorType).toHaveTextContent("Creator UGC");
    });
  });
});
