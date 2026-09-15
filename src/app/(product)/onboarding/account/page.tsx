import { ProfileHeaderMediaEditor } from "@/features/media";
import {
  importRegistrationGoogleAvatar,
  prepareRegistrationMediaAction,
  finalizeRegistrationMediaAction,
} from "@/features/media/server";
import { cookies } from "next/headers";
import { parseSignUpAccountIntent } from "@/features/identity";
import { loadRegistrationAccount } from "@/features/identity/server";
import {
  OnboardingFormShell,
  RegistrationAccountStep,
} from "@/features/onboarding";
import { saveRegistrationAccountAction } from "@/features/onboarding/server";
export default async function AccountPage() {
  const { account, user, requiresPassword } = await loadRegistrationAccount();
  const media = await importRegistrationGoogleAvatar();
  const intent = parseSignUpAccountIntent(
    (await cookies()).get("cc_signup_intent")?.value,
  );
  return (
    <OnboardingFormShell
      currentStep={3}
      totalSteps={6}
      progressLabel="Conta"
      title="Complete sua conta"
      description="Conte quem você é. Seu cadastro pode ser retomado depois."
    >
      <RegistrationAccountStep
        action={saveRegistrationAccountAction}
        email={user.email!}
        fullName={account.fullName ?? ""}
        requiresPassword={requiresPassword}
        intent={intent}
        mediaSection={
          <ProfileHeaderMediaEditor
            activateOnUpload={false}
            actions={{
              prepare: prepareRegistrationMediaAction,
              finalize: finalizeRegistrationMediaAction,
            }}
            avatar={{
              assetIdFieldName: "avatarAssetId",
              currentAssetId: media.avatar.id,
              initialUrl: media.avatar.url,
              label: "Foto de perfil",
              purpose: "AVATAR",
            }}
            cover={{
              assetIdFieldName: "coverAssetId",
              currentAssetId: media.cover.id,
              initialUrl: media.cover.url,
              label: "Capa",
              purpose: "COVER",
            }}
            badges={[]}
            location=""
            displayName={account.fullName ?? "Seu nome"}
            initials={(account.fullName ?? "").slice(0, 2)}
            helperText="Foto opcional. Você pode ajustar ou trocar a imagem."
          />
        }
      />
    </OnboardingFormShell>
  );
}
