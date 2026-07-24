import type { Metadata } from "next";

import {
  AuthPageShell,
  LoginForm,
  sanitizeBackofficeReturnPath,
} from "@/features/identity";
import {
  signInBackofficeAction,
  startBackofficeGoogleSignInAction,
} from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Acesso administrativo",
  description: "Acesse o backoffice da Contente Creators.",
};

const errorMessages: Record<string, string> = {
  callback:
    "Não foi possível validar este acesso. Inicie o processo novamente.",
  provider:
    "Não foi possível entrar com o Google agora. Tente novamente em instantes.",
  unauthorized:
    "Não foi possível autorizar o acesso administrativo com esta conta.",
};

interface BackofficeLoginPageProps {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BackofficeLoginPage({
  searchParams,
}: BackofficeLoginPageProps) {
  const parameters = await searchParams;
  const error = firstSearchParam(parameters.error);
  const nextPath = sanitizeBackofficeReturnPath(
    firstSearchParam(parameters.next),
  );

  return (
    <AuthPageShell
      description="Use sua identidade administrativa para acessar as operações da plataforma."
      eyebrow="Backoffice"
      title="Acesso administrativo"
    >
      <LoginForm
        googleAction={startBackofficeGoogleSignInAction}
        initialMessage={error ? errorMessages[error] : undefined}
        initialNextPath={nextPath}
        mode="backoffice"
        signInAction={signInBackofficeAction}
      />
    </AuthPageShell>
  );
}
