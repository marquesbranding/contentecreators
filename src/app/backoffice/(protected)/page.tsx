import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

import { AdminProvisioningForm } from "@/features/identity";
import {
  provisionAdditionalAdminAction,
  signOutAction,
} from "@/features/identity/server";
import { BrandLogo } from "@/shared/components/brand-logo";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default function BackofficeHomePage() {
  return (
    <main className="bg-brand-canvas min-h-screen">
      <header className="bg-brand-night border-b border-white/10 text-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLogo className="h-11 w-32 shrink-0" />
            <span className="truncate border-l border-white/20 pl-4 text-sm font-semibold">
              Backoffice
            </span>
          </div>
          <form action={signOutAction}>
            <Button
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              type="submit"
              variant="outline"
            >
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-brand-blue flex items-center gap-2 text-sm font-bold">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Ambiente protegido
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Operações da plataforma
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-7">
            Somente administradores aprovados podem acessar esta área.
          </p>
        </div>

        <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <LayoutDashboard
                aria-hidden="true"
                className="text-brand-blue size-6"
              />
              <CardTitle>Backoffice conectado</CardTitle>
              <CardDescription>
                Os módulos de indicadores, cadastros e moderação serão
                adicionados nos próximos slices do MVP.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              O acesso administrativo e a validação de papel já estão ativos.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar administrador</CardTitle>
              <CardDescription>
                Envie um convite e registre o motivo da concessão. A ação fica
                vinculada ao seu usuário no histórico de auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminProvisioningForm action={provisionAdditionalAdminAction} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
