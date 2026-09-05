import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createQueryTestClient, QueryTestProvider } from "@/test/query-harness";

import { ProfileOnboardingForm } from "./profile-onboarding-form.client";

describe("ProfileOnboardingForm correction mode", () => {
  it("prefills the persisted profile and submits stable correction metadata", () => {
    const { container } = render(
      <QueryTestProvider client={createQueryTestClient()}>
        <ProfileOnboardingForm
          action={vi.fn(async () => ({ status: "idle" as const }))}
          correctionCommand={{
            expectedAccountVersion: 7,
            expectedProfileVersion: 4,
            idempotencyKey: "99000000-0000-4000-8000-000000000003",
          }}
          draftAction={vi.fn(async () => ({
            kind: "unavailable" as const,
            message: "Rascunho indisponível.",
          }))}
          initialDraft={null}
          initialMediaState={{
            coverAssetId: null,
            primaryAssetId: null,
            profileExists: true,
          }}
          mediaActions={{
            finalize: vi.fn(),
            prepare: vi.fn(),
          }}
          initialValues={{
            bio: "Perfil persistido que precisa de uma correção pontual.",
            city: "Curitiba",
            creatorType: "INFLUENCER",
            displayName: "Carla em Cena",
            legalName: "Carla Exemplo",
            nicheSlugs: ["beleza-maquiagem-e-cuidados-pessoais"],
            socialChannels: [
              {
                followerCount: 15_000,
                isPrimary: true,
                platform: "INSTAGRAM",
                url: "https://instagram.com/carla-em-cena",
              },
            ],
            state: "PR",
            whatsapp: "+5541999999999",
          }}
          role="INFLUENCER"
        />
      </QueryTestProvider>,
    );

    expect(screen.getByLabelText("Nome completo")).toHaveValue("Carla Exemplo");
    expect(screen.getByLabelText("Seguidores no Instagram")).toHaveValue(
      15_000,
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="expectedAccountVersion"]',
      ),
    ).toHaveValue("7");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="expectedProfileVersion"]',
      ),
    ).toHaveValue("4");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="resubmissionIdempotencyKey"]',
      ),
    ).toHaveValue("99000000-0000-4000-8000-000000000003");
  });

  it("keeps the submit button enabled even with required fields left empty", () => {
    render(
      <QueryTestProvider client={createQueryTestClient()}>
        <ProfileOnboardingForm
          action={vi.fn(async () => ({ status: "idle" as const }))}
          draftAction={vi.fn(async () => ({
            kind: "unavailable" as const,
            message: "Rascunho indisponível.",
          }))}
          initialDraft={null}
          initialMediaState={{
            coverAssetId: null,
            primaryAssetId: null,
            profileExists: false,
          }}
          mediaActions={{
            finalize: vi.fn(),
            prepare: vi.fn(),
          }}
          role="INFLUENCER"
        />
      </QueryTestProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Enviar perfil para análise" }),
    ).toBeEnabled();
  });
});
