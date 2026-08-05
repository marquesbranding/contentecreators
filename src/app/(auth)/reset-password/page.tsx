import type { Metadata } from "next";

import {
  AuthPageShell,
  RecoveryLinkUnavailable,
  ResetPasswordRecoveryGate,
  ResetPasswordForm,
} from "@/features/identity";
import { createServerIdentityAuthService } from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Criar nova senha",
  description: "Defina uma nova senha para sua conta.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    code?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const parameters = await searchParams;
  const code = firstSearchParam(parameters.code);

  const identity = code
    ? null
    : await (await createServerIdentityAuthService()).requireVerifiedIdentity();

  return (
    <AuthPageShell
      description="Escolha uma senha forte e diferente das que você utiliza em outros serviços."
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
    >
      {code ? (
        <ResetPasswordRecoveryGate code={code} />
      ) : identity?.kind === "verified" ? (
        <ResetPasswordForm />
      ) : (
        <RecoveryLinkUnavailable />
      )}
    </AuthPageShell>
  );
}
