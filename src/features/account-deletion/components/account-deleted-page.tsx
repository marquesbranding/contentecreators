import Link from "next/link";

import { LegalPageHeader } from "@/shared/components/legal-page-header";

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
          Sua conta foi excluída
        </h1>
        <div className="mt-6 space-y-4 leading-7 text-[#333]">
          <p>
            Apagamos seu perfil, suas fotos e seus dados, e você foi
            desconectado em todos os dispositivos. Enviamos um e-mail de
            confirmação.
          </p>
          <p>
            Guardamos apenas o que a lei exige, sem seu nome nem seu e-mail.
            Detalhes na{" "}
            <Link
              className="text-brand-blue font-semibold underline"
              href="/privacy"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <p>
            Se quiser voltar, é só se cadastrar de novo quando quiser: entre com
            o mesmo e-mail ou a mesma conta Google e comece um cadastro do zero.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-black bg-white px-4 font-semibold"
            href="/"
          >
            Voltar para a página inicial
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-black bg-black px-4 font-semibold text-white"
            href="/login"
          >
            Entrar e cadastrar de novo
          </Link>
        </div>
      </main>
    </div>
  );
}
