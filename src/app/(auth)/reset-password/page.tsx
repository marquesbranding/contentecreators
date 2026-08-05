import type { Metadata } from "next";

import { AuthPageShell, ResetPasswordRecoveryGate } from "@/features/identity";

export const metadata: Metadata = {
  title: "Criar nova senha",
  description: "Defina uma nova senha para sua conta.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
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
  const tokenHash = firstSearchParam(parameters.token_hash);
  const type = firstSearchParam(parameters.type);

  return (
    <AuthPageShell
      description="Escolha uma senha forte e diferente das que você utiliza em outros serviços."
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
    >
      <ResetPasswordRecoveryGate
        code={code}
        tokenHash={tokenHash}
        type={type}
      />
    </AuthPageShell>
  );
}
