import type { Metadata } from "next";

import { AuthPageShell, ForgotPasswordForm } from "@/features/identity";
import { forgotPasswordAction } from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Solicite um link seguro para redefinir sua senha.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      description="Informe o e-mail da sua conta. Se encontrarmos um cadastro, enviaremos as instruções."
      eyebrow="Recuperação de acesso"
      title="Redefina sua senha"
    >
      <ForgotPasswordForm action={forgotPasswordAction} />
    </AuthPageShell>
  );
}
