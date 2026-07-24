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
          initialValues={{
            bio: "Perfil persistido que precisa de uma correção pontual.",
            city: "Curitiba",
            creatorType: "INFLUENCER",
            displayName: "Carla em Cena",
            engagementRate: 4.5,
            followers: 15_000,
            legalName: "Carla Exemplo",
            nicheSlugs: ["beleza"],
            socialPlatform: "TIKTOK",
            socialUrl: "https://tiktok.com/@carla-em-cena",
            state: "PR",
            whatsapp: "+5541999999999",
          }}
          role="INFLUENCER"
        />
      </QueryTestProvider>,
    );

    expect(screen.getByLabelText("Nome completo")).toHaveValue("Carla Exemplo");
    expect(screen.getByLabelText("Nome de creator")).toHaveValue(
      "Carla em Cena",
    );
    expect(screen.getByLabelText("Número de seguidores")).toHaveValue(15_000);
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
});
