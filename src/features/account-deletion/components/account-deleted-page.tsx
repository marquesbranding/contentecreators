import Link from "next/link";

import { LegalPageHeader } from "@/shared/components/legal-page-header";

import {
  ELIMINATION_DEADLINE_DAYS,
  RECOVERY_WINDOW_DAYS,
} from "../domain/deletion-policy";

export function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-black">
      <LegalPageHeader />
      <main
        className="mx-auto max-w-2xl px-5 py-14 sm:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <h1 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
          Recebemos seu pedido de exclusão
        </h1>
        <div className="mt-6 space-y-4 leading-7 text-[#333]">
          <p>
            Sua conta foi desativada: o perfil não aparece mais para outros
            usuários e você foi desconectado. Enviamos um e-mail de confirmação.
          </p>
          <p>
            Se foi um engano, escreva para{" "}
            <a
              className="text-brand-blue font-semibold underline"
              href="mailto:contato@marquesbranding.com"
            >
              contato@marquesbranding.com
            </a>{" "}
            em até {RECOVERY_WINDOW_DAYS} dias e recuperamos a sua conta.
          </p>
          <p>
            Depois disso, eliminamos seus dados pessoais em até{" "}
            {ELIMINATION_DEADLINE_DAYS} dias, guardando apenas o que a lei
            exige. Detalhes na{" "}
            <Link
              className="text-brand-blue font-semibold underline"
              href="/privacy"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <Link
          className="mt-8 inline-flex min-h-11 items-center rounded-xl border-2 border-black bg-white px-4 font-semibold"
          href="/"
        >
          Voltar para a página inicial
        </Link>
      </main>
    </div>
  );
}
