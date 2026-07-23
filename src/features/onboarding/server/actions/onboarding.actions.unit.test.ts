import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { createServerOnboardingRegistrationService } from "../services/server-onboarding-registration.service";
import { submitGoogleProfileAction } from "./onboarding.actions";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/shared/server/supabase/server-client", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("../services/server-onboarding-registration.service", () => ({
  createServerOnboardingRegistrationService: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);
const mockedCreateRegistrationService = vi.mocked(
  createServerOnboardingRegistrationService,
);

function completeCreatorProfile() {
  const formData = new FormData();
  const fields = {
    bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
    city: "São Paulo",
    creatorType: "INFLUENCER",
    displayName: "Joana Cria",
    engagementRate: "4.25",
    followers: "12500",
    legalName: "Joana da Silva",
    privacyAccepted: "on",
    role: "INFLUENCER",
    socialPlatform: "INSTAGRAM",
    socialUrl: "https://instagram.com/joanacria",
    state: "SP",
    termsAccepted: "on",
    whatsapp: "(11) 99999-9999",
  };

  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  formData.append("nicheSlugs", "tecnologia");

  return formData;
}

describe("onboarding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "joana@example.com",
              id: "91000000-0000-4000-8000-000000000010",
            },
          },
        }),
      },
    } as never);
  });

  it("does not swallow Next.js redirect after Google profile submission", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");
    const submitGoogleProfile = vi.fn().mockResolvedValue({
      destination: "/app/status/analysis",
    });
    mockedCreateRegistrationService.mockResolvedValue({
      finalizePreparedRegistration: vi.fn(),
      registerWithEmail: vi.fn(),
      submitGoogleProfile,
    });
    redirect.mockImplementation(() => {
      throw redirectSignal;
    });

    await expect(
      submitGoogleProfileAction({ status: "idle" }, completeCreatorProfile()),
    ).rejects.toBe(redirectSignal);

    expect(submitGoogleProfile).toHaveBeenCalledWith({
      email: "joana@example.com",
      identityId: "91000000-0000-4000-8000-000000000010",
      profile: expect.objectContaining({
        role: "INFLUENCER",
      }),
    });
    expect(redirect).toHaveBeenCalledWith("/app/status/analysis");
  });
});
