import type { Metadata } from "next";

import { AuthPageShell, ConfirmEmailForm } from "@/features/identity";
import { resendConfirmationAction } from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Confirmar e-mail",
  description: "Reenvie a confirmação do seu e-mail.",
};

export default function ConfirmEmailPage() {
  return (
    <AuthPageShell
      description="Ainda não recebeu a mensagem? Informe o mesmo e-mail usado no cadastro para solicitar um novo envio."
      eyebrow="Validação de identidade"
      title="Confirme seu e-mail"
    >
      <ConfirmEmailForm action={resendConfirmationAction} />
    </AuthPageShell>
  );
}
