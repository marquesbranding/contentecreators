import { BadgeCheck, FlaskConical, Search } from "lucide-react";
import type { ReactNode } from "react";

import { AuthenticatedProductShell } from "@/features/identity";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function ApprovedCatalogEntry({
  children,
  signOutAction,
  viewerRole,
}: {
  children?: ReactNode;
  signOutAction: () => Promise<void>;
  viewerRole: "COMPANY" | "INFLUENCER";
}) {
  const companyViewer = viewerRole === "COMPANY";

  return (
    <AuthenticatedProductShell signOutAction={signOutAction}>
      <main
        className="px-4 py-5 sm:px-8 sm:py-8"
        id="main-content"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="border-brand-lime/25 bg-brand-night flex items-start gap-3 rounded-2xl border px-4 py-3 text-white sm:items-center sm:px-5"
            role="status"
          >
            <FlaskConical
              aria-hidden="true"
              className="text-brand-lime mt-0.5 size-5 shrink-0 sm:mt-0"
            />
            <p className="text-sm leading-6 text-white/80">
              <strong className="text-white">Você está no beta.</strong> O
              catálogo evolui continuamente; mantenha seu perfil atualizado para
              aproveitar melhor cada conexão.
            </p>
          </div>

          <Card className="bg-brand-night relative mt-5 gap-0 overflow-hidden rounded-3xl border-white/10 py-0 text-white shadow-xl">
            <div
              aria-hidden="true"
              className="bg-brand-blue/25 absolute -top-28 right-0 size-72 rounded-full blur-3xl"
            />
            <CardHeader className="relative gap-4 px-5 py-7 sm:px-8 sm:py-9">
              <Badge
                className="w-fit gap-2 rounded-full border-white/15 bg-white/10 text-white"
                variant="outline"
              >
                {companyViewer ? (
                  <Search aria-hidden="true" />
                ) : (
                  <BadgeCheck aria-hidden="true" />
                )}
                {companyViewer
                  ? "Descoberta de creators"
                  : "Comunidade aprovada"}
              </Badge>
              <CardTitle className="max-w-3xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                <h1>
                  {companyViewer
                    ? "Encontre creators para sua próxima campanha"
                    : "Conheça creators e marcas da comunidade"}
                </h1>
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-white/65">
                {companyViewer
                  ? "Descubra perfis aprovados, compare nichos e métricas informadas e encontre creators alinhados à sua marca."
                  : "Explore perfis aprovados, encontre outros creators e conheça as empresas que fazem parte da plataforma."}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="mt-8">
            {children ?? (
              <p className="text-muted-foreground text-sm leading-6">
                A busca, os filtros e os perfis de creators respeitam as regras
                de acesso, consentimento e situação cadastral.
              </p>
            )}
          </div>
        </div>
      </main>
    </AuthenticatedProductShell>
  );
}
