import type { Metadata } from "next";

import { AuthPageShell, LoginForm } from "@/features/identity";
import {
  signInAction,
  startGoogleSignInAction,
} from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta na Contente Creators.",
};

const errorMessages: Record<string, string> = {
  callback:
    "Não foi possível validar este acesso. Inicie o processo novamente.",
  provider:
    "Não foi possível entrar com o Google agora. Tente novamente em instantes.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const error = firstSearchParam(parameters.error);
  const nextPath = firstSearchParam(parameters.next) ?? "/onboarding/role";

  return (
    <AuthPageShell
      description="Entre com e-mail e senha ou continue com sua conta Google."
      eyebrow="Boas-vindas"
      title="Entre na sua conta"
    >
      <LoginForm
        googleAction={startGoogleSignInAction}
        initialMessage={error ? errorMessages[error] : undefined}
        initialNextPath={nextPath}
        signInAction={signInAction}
      />
    </AuthPageShell>
  );
}
