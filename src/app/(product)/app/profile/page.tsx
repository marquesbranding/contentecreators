import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  loadCurrentCompanyMediaFormState,
  loadCurrentInfluencerMediaFormState,
  prepareMediaUploadAction,
} from "@/features/media/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import { OnboardingFormShell } from "@/features/onboarding";
import {
  loadCurrentInfluencerProfile,
  loadCurrentCompanyProfile,
  updateCompanyProfileAction,
  updateInfluencerProfileAction,
} from "@/features/onboarding/server";

import { CompanyProfileEditor, ProfileEditor } from "./profile-editor.client";

export const metadata: Metadata = {
  title: "Meu perfil",
};

export default function ProfilePage() {
  return (
    <AccountStatusBoundary
      renderApproved={async (account) => {
        if (account.role === "COMPANY") {
          const [profile, mediaState] = await Promise.all([
            loadCurrentCompanyProfile(),
            loadCurrentCompanyMediaFormState(),
          ]);

          return (
            <OnboardingFormShell
              description="Revise os dados públicos da empresa. Alterações salvas são publicadas imediatamente e ficam registradas no histórico da plataforma."
              eyebrow="Perfil publicado"
              progressLabel="Dados, localidades e imagens"
              title="Edite o perfil da empresa"
            >
              <CompanyProfileEditor
                action={updateCompanyProfileAction}
                mediaActions={{
                  activate: activateProfileMediaAction,
                  finalize: finalizeMediaUploadAction,
                  prepare: prepareMediaUploadAction,
                }}
                mediaState={mediaState}
                profile={profile}
              />
            </OnboardingFormShell>
          );
        }

        if (account.role !== "INFLUENCER") {
          redirect("/app/catalog");
        }

        const [profile, mediaState] = await Promise.all([
          loadCurrentInfluencerProfile(),
          loadCurrentInfluencerMediaFormState(),
        ]);

        return (
          <OnboardingFormShell
            description="Revise suas informações públicas. Alterações salvas são publicadas imediatamente e ficam registradas no histórico da plataforma."
            eyebrow="Perfil publicado"
            progressLabel="Dados e imagens"
            title="Edite seu perfil de creator"
          >
            <ProfileEditor
              action={updateInfluencerProfileAction}
              mediaActions={{
                activate: activateProfileMediaAction,
                finalize: finalizeMediaUploadAction,
                prepare: prepareMediaUploadAction,
              }}
              mediaState={mediaState}
              profile={profile}
            />
          </OnboardingFormShell>
        );
      }}
    />
  );
}
