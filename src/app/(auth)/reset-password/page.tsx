import type { Metadata } from "next";

import {
  AuthPageShell,
  RecoveryLinkUnavailable,
  ResetPasswordForm,
} from "@/features/identity";
import {
  createServerIdentityAuthService,
  resetPasswordAction,
} from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Criar nova senha",
  description: "Defina uma nova senha para sua conta.",
};

export default async function ResetPasswordPage() {
  const service = await createServerIdentityAuthService();
  const identity = await service.requireVerifiedIdentity();

  return (
    <AuthPageShell
      description="Escolha uma senha forte e diferente das que você utiliza em outros serviços."
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
    >
      {identity.kind === "verified" ? (
        <ResetPasswordForm action={resetPasswordAction} />
      ) : (
        <RecoveryLinkUnavailable />
      )}
    </AuthPageShell>
  );
}
