import { LogOut, SearchCheck, UserRoundPen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  children,
  showProfileLink = false,
  signOutAction,
}: {
  children?: ReactNode;
  showProfileLink?: boolean;
  signOutAction: () => Promise<void>;
}) {
  return (
    <main
      className="bg-brand-canvas min-h-screen px-4 py-6 sm:px-8 sm:py-10"
      id="main-content"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <div className="flex items-center gap-2">
            {showProfileLink ? (
              <Link
                className={buttonVariants({
                  className: "min-h-11",
                  variant: "outline",
                })}
                href="/app/profile"
              >
                <UserRoundPen aria-hidden="true" />
                Meu perfil
              </Link>
            ) : null}
            <form action={signOutAction}>
              <Button className="min-h-11" type="submit" variant="outline">
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
              <h1>Encontre creators para novas conexões</h1>
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Explore somente perfis aprovados e use busca e filtros para
              encontrar pessoas alinhadas ao seu objetivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-6 sm:px-9 sm:py-8">
            {children ?? (
              <p className="text-muted-foreground text-sm leading-6">
                A busca, os filtros e os perfis de creators respeitam as regras
                de acesso, consentimento e situação cadastral.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
