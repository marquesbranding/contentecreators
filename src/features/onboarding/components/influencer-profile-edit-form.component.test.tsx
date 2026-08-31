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
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia-games-e-inovacao"],
  socialChannels: [
    {
      followerCount: 12_500,
      isPrimary: true,
      platform: "INSTAGRAM",
      url: "https://instagram.com/joanacria",
    },
  ],
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

    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Joana da Silva",
    );
    /* Creator type is fixed at signup and can't change here — the edit form
     * doesn't even submit it, so it must not render a picker for it. */
    expect(screen.queryByText("Como você cria conteúdo?")).not.toBeInTheDocument();
    expect(screen.queryByText("Tipo de atuação")).not.toBeInTheDocument();
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

    await user.clear(screen.getByLabelText("Nome completo"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome completo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Corrija os campos abaixo")).toBeInTheDocument();
  });

  it("supports an audited administrative reason without forking the profile form", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <InfluencerProfileEditForm
        action={action}
        backHref="/backoffice/accounts/account-id"
        backLabel="Cancelar e voltar"
        changeReason={{
          description: "Este motivo ficará no histórico.",
          label: "Motivo da alteração administrativa",
          placeholder: "Descreva o ajuste realizado.",
        }}
        expectedVersion={profile.version}
        formLabel="Editar perfil pelo backoffice"
        profile={profile}
        submitLabel="Salvar alteração auditada"
      />,
    );

    const reason = screen.getByLabelText("Motivo da alteração administrativa");
    expect(reason).toBeRequired();
    expect(
      screen.getByRole("link", { name: "Cancelar e voltar" }),
    ).toHaveAttribute("href", "/backoffice/accounts/account-id");

    await user.click(
      screen.getByRole("button", { name: "Salvar alteração auditada" }),
    );

    expect(action).not.toHaveBeenCalled();
    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(reason).toHaveFocus();
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
    /* Creator type no longer sits here — it's immutable after signup, so the
     * edit form skips it entirely rather than showing a picker that does
     * nothing on save. */
    expect(screen.getByLabelText("WhatsApp com DDD")).toHaveFocus();
  });
});
