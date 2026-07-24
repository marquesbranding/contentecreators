import { LogOut, SearchCheck, UserRoundPen } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function ApprovedCatalogEntry({
  showProfileLink = false,
  signOutAction,
}: {
  showProfileLink?: boolean;
  signOutAction: () => Promise<void>;
}) {
  return (
    <main className="bg-brand-canvas min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <div className="flex items-center gap-2">
            {showProfileLink ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/app/profile"
              >
                <UserRoundPen aria-hidden="true" />
                Meu perfil
              </Link>
            ) : null}
            <form action={signOutAction}>
              <Button type="submit" variant="outline">
                <LogOut aria-hidden="true" />
                Sair
              </Button>
            </form>
          </div>
        </header>
        <Card className="mt-8 gap-0 overflow-hidden rounded-3xl py-0">
          <CardHeader className="gap-4 border-b px-6 py-8 sm:px-9">
            <Badge className="w-fit gap-2 rounded-full" variant="secondary">
              <SearchCheck aria-hidden="true" />
              Acesso aprovado
            </Badge>
            <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              <h1>Seu acesso ao catálogo está liberado</h1>
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Os perfis elegíveis serão apresentados aqui pelo catálogo privado.
              Nenhum dado público ou perfil não aprovado é carregado nesta
              etapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-8 sm:px-9">
            <p className="text-muted-foreground text-sm leading-6">
              A busca, os filtros e os perfis de creators respeitarão as regras
              de acesso, consentimento e situação cadastral.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
