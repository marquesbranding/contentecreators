import Link from "next/link";

import {
  COOKIE_REGISTRY_VERSION,
  advertisingCookieTechnologies,
  essentialCookieTechnologies,
  type CookieTechnology,
} from "@/features/cookie-consent/domain/cookie-registry";
import { LegalPageHeader } from "@/shared/components/legal-page-header";

import { CookiePreferencesButton } from "./cookie-preferences-button.client";

function TechnologyTable({
  caption,
  technologies,
}: {
  caption: string;
  technologies: readonly CookieTechnology[];
}) {
  return (
    <div
      aria-label={caption}
      className="mt-4 overflow-x-auto border-2 border-black bg-white"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-black text-white">
          <tr>
            <th className="p-3 font-extrabold" scope="col">
              Cookie ou tecnologia
            </th>
            <th className="p-3 font-extrabold" scope="col">
              Fornecedor
            </th>
            <th className="p-3 font-extrabold" scope="col">
              Finalidade
            </th>
            <th className="p-3 font-extrabold" scope="col">
              Prazo
            </th>
          </tr>
        </thead>
        <tbody>
          {technologies.map((technology) => (
            <tr className="border-t border-black/20" key={technology.name}>
              <th className="p-3 align-top font-bold" scope="row">
                <code>{technology.name}</code>
              </th>
              <td className="p-3 align-top">{technology.provider}</td>
              <td className="p-3 align-top">{technology.purpose}</td>
              <td className="p-3 align-top">{technology.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookieNoticePage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-black">
      <LegalPageHeader />
      <main
        className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14"
        id="main-content"
        tabIndex={-1}
      >
        <p className="text-sm font-extrabold tracking-[0.12em] text-[#0059db] uppercase">
          Documento legal
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
          Aviso de cookies
        </h1>
        <p className="mt-2 font-semibold text-[#555]">
          Lista versão {COOKIE_REGISTRY_VERSION}
        </p>
        <div className="mt-6 space-y-4 leading-7 text-[#333]">
          <p>
            Cookies são pequenos arquivos que o navegador guarda para lembrar
            informações. Usamos dois tipos, conforme o capítulo 11 da nossa{" "}
            <Link
              className="text-brand-blue font-semibold underline"
              href="/privacy"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <p>
            <CookiePreferencesButton className="inline-flex min-h-11 items-center rounded-xl border-2 border-black bg-white px-4 font-semibold focus-visible:ring-3 focus-visible:ring-[#0059db]/50 focus-visible:outline-none" />
          </p>
        </div>

        <section aria-labelledby="essential-heading" className="mt-10">
          <h2
            className="text-2xl font-extrabold tracking-[-0.025em]"
            id="essential-heading"
          >
            Essenciais
          </h2>
          <p className="mt-2 leading-7 text-[#333]">
            Mantêm você conectado, guardam suas escolhas sobre cookies e
            protegem a plataforma. Não dependem de consentimento. Você pode
            bloqueá-los no navegador, mas o login pode deixar de funcionar.
          </p>
          <TechnologyTable
            caption="Cookies essenciais"
            technologies={essentialCookieTechnologies}
          />
        </section>

        <section aria-labelledby="advertising-heading" className="mt-10">
          <h2
            className="text-2xl font-extrabold tracking-[-0.025em]"
            id="advertising-heading"
          >
            Publicidade e medição
          </h2>
          <p className="mt-2 leading-7 text-[#333]">
            Só são ativados se você aceitar. Medimos o resultado das nossas
            campanhas e exibimos anúncios da Contente em outros sites e redes
            sociais, usando o Google Ads e o Meta Pixel, que podem tratar dados
            fora do Brasil conforme as próprias políticas de privacidade.
            Recusar não impede o uso da plataforma.
          </p>
          <TechnologyTable
            caption="Cookies de publicidade e medição"
            technologies={advertisingCookieTechnologies}
          />
        </section>

        <section aria-labelledby="control-heading" className="mt-10">
          <h2
            className="text-2xl font-extrabold tracking-[-0.025em]"
            id="control-heading"
          >
            Como mudar sua escolha
          </h2>
          <p className="mt-2 leading-7 text-[#333]">
            Use “Preferências de cookies” aqui ou no rodapé de qualquer página
            para aceitar ou revogar a qualquer momento. Também é possível
            bloquear ou apagar cookies nas configurações do navegador. Dúvidas:
            contato@marquesbranding.com.
          </p>
        </section>
      </main>
    </div>
  );
}
