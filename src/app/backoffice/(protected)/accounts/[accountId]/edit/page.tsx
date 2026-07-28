import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CompanyProfileEditForm,
  InfluencerProfileEditForm,
} from "@/features/onboarding";
import {
  AdminProfileEditError,
  createServerAdminProfileEditService,
  updateCompanyProfileAsAdminAction,
  updateInfluencerProfileAsAdminAction,
} from "@/features/onboarding/server";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const changeReason = {
  description:
    "O motivo será registrado no histórico imutável com sua identificação administrativa.",
  label: "Motivo da alteração administrativa",
  placeholder:
    "Descreva o ajuste realizado e o contexto que autoriza esta alteração.",
};

export default async function BackofficeAccountProfileEditPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      accountId,
    )
  ) {
    notFound();
  }

  const service = await createServerAdminProfileEditService();
  let editableProfile;

  try {
    editableProfile = await service.loadEditableProfile({
      accountId,
      requestId: crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof AdminProfileEditError) {
      notFound();
    }

    throw error;
  }

  const detailHref = `/backoffice/accounts/${accountId}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Link
          className="text-brand-blue focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold outline-none focus-visible:ring-2"
          href={detailHref}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar aos detalhes da conta
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Editar perfil pelo backoffice
          </h1>
          <Badge variant="outline">
            {editableProfile.role === "INFLUENCER" ? "Creator" : "Empresa"}
          </Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Use o mesmo contrato validado da edição do titular. A aprovação não é
          alterada automaticamente e toda mudança fica vinculada ao
          administrador responsável.
        </p>
      </div>

      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Operação administrativa auditada</AlertTitle>
        <AlertDescription>
          Confirme os dados com o titular antes de salvar. Perfis banidos ou
          arquivados não podem ser editados por esta tela.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Dados do perfil</CardTitle>
          <CardDescription>
            Campos obrigatórios e regras de validação são idênticos aos usados
            na edição feita pelo próprio titular.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editableProfile.role === "INFLUENCER" ? (
            <InfluencerProfileEditForm
              action={updateInfluencerProfileAsAdminAction.bind(
                null,
                accountId,
              )}
              backHref={detailHref}
              backLabel="Cancelar e voltar"
              changeReason={changeReason}
              expectedVersion={editableProfile.profile.version}
              formLabel="Editar perfil de creator pelo backoffice"
              profile={editableProfile.profile}
              submitLabel="Salvar alteração auditada"
            />
          ) : (
            <CompanyProfileEditForm
              action={updateCompanyProfileAsAdminAction.bind(null, accountId)}
              backHref={detailHref}
              backLabel="Cancelar e voltar"
              changeReason={changeReason}
              expectedVersion={editableProfile.profile.version}
              formLabel="Editar perfil de empresa pelo backoffice"
              profile={editableProfile.profile}
              submitLabel="Salvar alteração auditada"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
