import type { Metadata } from "next";

import {
  BackofficeAnalyticsScreen,
  parseBackofficeAnalyticsSearchParams,
} from "@/features/backoffice";
import { AdminProvisioningForm } from "@/features/identity";
import { provisionAdditionalAdminAction } from "@/features/identity/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export const metadata: Metadata = {
  title: "Visão geral do backoffice",
};

type DashboardPageSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: DashboardPageSearchParams) {
  const result = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      result.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      result.set(key, value[0]);
    }
  }

  return result;
}

export default async function BackofficeHomePage({
  searchParams,
}: {
  searchParams: Promise<DashboardPageSearchParams>;
}) {
  const filters = parseBackofficeAnalyticsSearchParams(
    toUrlSearchParams(await searchParams),
  );

  return (
    <div className="space-y-10">
      <BackofficeAnalyticsScreen filters={filters} />

      <section aria-labelledby="admin-provisioning-heading">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle id="admin-provisioning-heading">
              Adicionar administrador
            </CardTitle>
            <CardDescription>
              Envie um convite e registre o motivo da concessão. A ação fica
              vinculada ao seu usuário no histórico de auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminProvisioningForm action={provisionAdditionalAdminAction} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
