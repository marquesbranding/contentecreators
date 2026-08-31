import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  getServerSignedMedia,
  loadCurrentCompanyMediaFormState,
  loadCurrentInfluencerMediaFormState,
  prepareMediaUploadAction,
  removeProfileMediaAction,
} from "@/features/media/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import {
  OnboardingFormShell,
  ProfileCompletionIndicator,
} from "@/features/onboarding";
import {
  loadCurrentInfluencerProfile,
  loadCurrentCompanyProfile,
  loadCurrentProfileCompletion,
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
          const [profile, mediaState, completion] = await Promise.all([
            loadCurrentCompanyProfile(),
            loadCurrentCompanyMediaFormState(),
            loadCurrentProfileCompletion(),
          ]);
          /* The form state only carries asset ids; the header preview needs
           * displayable URLs. */
          const [logoMedia, coverMedia] = await Promise.all([
            mediaState.logoAssetId
              ? getServerSignedMedia(mediaState.logoAssetId)
              : null,
            mediaState.coverAssetId
              ? getServerSignedMedia(mediaState.coverAssetId)
              : null,
          ]);

          return (
            <AuthenticatedProductShell signOutAction={signOutAction}>
              <OnboardingFormShell
                description="Revise os dados públicos da empresa. Alterações salvas são publicadas imediatamente e ficam registradas no histórico da plataforma."
                eyebrow="Perfil publicado"
                progressLabel="Dados, localidades e imagens"
                showBrandHeader={false}
                title="Edite o perfil da empresa"
              >
                <div className="space-y-8">
                  <ProfileCompletionIndicator
                    completion={completion}
                    role="COMPANY"
                  />
                  <CompanyProfileEditor
                    action={updateCompanyProfileAction}
                    coverUrl={coverMedia?.url ?? null}
                    logoUrl={logoMedia?.url ?? null}
                    mediaActions={{
                      activate: activateProfileMediaAction,
                      finalize: finalizeMediaUploadAction,
                      prepare: prepareMediaUploadAction,
                      remove: removeProfileMediaAction,
                    }}
                    mediaState={mediaState}
                    profile={profile}
                  />
                </div>
              </OnboardingFormShell>
            </AuthenticatedProductShell>
          );
        }

        if (account.role !== "INFLUENCER") {
          redirect("/app/catalog");
        }

        const [profile, mediaState, completion] = await Promise.all([
          loadCurrentInfluencerProfile(),
          loadCurrentInfluencerMediaFormState(),
          loadCurrentProfileCompletion(),
        ]);
        const [avatarMedia, coverMedia] = await Promise.all([
          mediaState.avatarAssetId
            ? getServerSignedMedia(mediaState.avatarAssetId)
            : null,
          mediaState.coverAssetId
            ? getServerSignedMedia(mediaState.coverAssetId)
            : null,
        ]);

        return (
          <AuthenticatedProductShell signOutAction={signOutAction}>
            <OnboardingFormShell
              description="Revise suas informações públicas. Alterações salvas são publicadas imediatamente e ficam registradas no histórico da plataforma."
              eyebrow="Perfil publicado"
              progressLabel="Dados e imagens"
              showBrandHeader={false}
              title="Edite seu perfil de creator"
            >
              <div className="space-y-8">
                <ProfileCompletionIndicator
                  completion={completion}
                  role="INFLUENCER"
                />
                <ProfileEditor
                  action={updateInfluencerProfileAction}
                  avatarUrl={avatarMedia?.url ?? null}
                  coverUrl={coverMedia?.url ?? null}
                  mediaActions={{
                    activate: activateProfileMediaAction,
                    finalize: finalizeMediaUploadAction,
                    prepare: prepareMediaUploadAction,
                    remove: removeProfileMediaAction,
                  }}
                  mediaState={mediaState}
                  profile={profile}
                />
              </div>
            </OnboardingFormShell>
          </AuthenticatedProductShell>
        );
      }}
    />
  );
}
