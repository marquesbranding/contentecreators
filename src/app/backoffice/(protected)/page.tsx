import { LayoutDashboard, ShieldCheck } from "lucide-react";

import { AdminProvisioningForm } from "@/features/identity";
import { provisionAdditionalAdminAction } from "@/features/identity/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default function BackofficeHomePage() {
  return (
    <>
      <section>
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
    </>
  );
}
