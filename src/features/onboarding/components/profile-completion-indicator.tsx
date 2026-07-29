import { CheckCircle2, CircleDashed, ListChecks } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress, ProgressLabel } from "@/shared/components/ui/progress";

import type {
  ProfileCompletionField,
  ProfileCompletionRole,
  ProfileCompletionResult,
} from "../domain/profile-completion";

const sharedLabels: Partial<Record<ProfileCompletionField, string>> = {
  cover: "Adicionar imagem de capa",
  legalName: "Completar o nome legal",
  socialProfile: "Adicionar uma rede social válida",
  verifiedEmail: "Confirmar o e-mail da conta",
  whatsapp: "Completar o WhatsApp",
};

const creatorLabels: Partial<Record<ProfileCompletionField, string>> = {
  ...sharedLabels,
  avatar: "Adicionar foto de perfil",
  bio: "Completar a apresentação",
  creatorType: "Escolher o tipo de atuação",
  displayName: "Completar o nome de creator",
  location: "Completar cidade e estado",
  metricSnapshot: "Adicionar métricas autodeclaradas",
  niches: "Selecionar pelo menos um nicho",
  socialProfile: "Adicionar uma rede social do creator",
};

const companyLabels: Partial<Record<ProfileCompletionField, string>> = {
  ...sharedLabels,
  additionalLocation: "Adicionar outra localidade",
  cnpj: "Completar um CNPJ válido",
  description: "Completar a apresentação da empresa",
  employeeRange: "Informar o tamanho da empresa",
  logo: "Adicionar o logo da empresa",
  primaryLocation: "Completar o endereço principal",
  segment: "Completar o segmento",
  socialProfile: "Adicionar uma rede social da empresa",
  tradeName: "Completar o nome fantasia",
  website: "Adicionar o site da empresa",
};

function missingFieldLabel(
  field: ProfileCompletionField,
  role: ProfileCompletionRole,
) {
  const labels = role === "COMPANY" ? companyLabels : creatorLabels;
  return labels[field] ?? "Completar uma informação do perfil";
}

export function ProfileCompletionIndicator({
  completion,
  role,
}: {
  completion: ProfileCompletionResult;
  role: ProfileCompletionRole;
}) {
  const isComplete = completion.percentage === 100;

  return (
    <Card className="gap-5 border-black/10">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span className="bg-brand-blue/10 text-brand-blue flex size-10 shrink-0 items-center justify-center rounded-full">
            {isComplete ? (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            ) : (
              <CircleDashed aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="space-y-1">
            <CardTitle>
              <h2>{isComplete ? "Perfil completo" : "Complete seu perfil"}</h2>
            </CardTitle>
            <CardDescription>
              {isComplete
                ? "Seu perfil reúne todos os itens previstos nesta versão."
                : "Os itens abaixo aumentam a qualidade das informações apresentadas no catálogo."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress
          aria-label={`Conclusão do perfil: ${completion.percentage}%`}
          value={completion.percentage}
        >
          <ProgressLabel>
            {`Conclusão do perfil: ${completion.percentage}%`}
          </ProgressLabel>
          <span className="text-muted-foreground ml-auto text-sm tabular-nums">
            {completion.percentage}%
          </span>
        </Progress>

        {!isComplete && completion.missingFields.length > 0 ? (
          <div className="bg-muted/60 rounded-2xl border p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks aria-hidden="true" className="size-4" />
              Próximos itens
            </p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {completion.missingFields.map((field) => (
                <li className="flex items-start gap-2" key={field}>
                  <CircleDashed
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <span>{missingFieldLabel(field, role)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
