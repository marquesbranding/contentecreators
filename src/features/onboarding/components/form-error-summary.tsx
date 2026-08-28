"use client";

import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import type { FieldErrors } from "@/shared/hooks/use-required-field-validation";

const fieldLabels: Record<string, string> = {
  accountType: "Tipo de cadastro",
  avatarAssetId: "Foto de perfil",
  bio: "Conte sobre seu conteúdo",
  city: "Cidade",
  cnpj: "CNPJ",
  complement: "Complemento",
  coverAssetId: "Capa",
  creatorType: "Tipo de atuação",
  description: "Apresente a empresa",
  displayName: "Nome de creator",
  email: "E-mail",
  employeeRange: "Tamanho da empresa",
  legalName: "Nome ou razão social",
  additionalLocations: "Localidades adicionais",
  neighborhood: "Bairro",
  nicheSlugs: "Principais nichos",
  otherNiche: "Outro nicho",
  number: "Número",
  password: "Senha",
  passwordConfirmation: "Confirmar senha",
  postalCode: "CEP",
  privacyAccepted: "Política de Privacidade",
  role: "Tipo de cadastro",
  segment: "Segmento",
  socialChannels: "Audiência e canais",
  socialPlatform: "Canal principal",
  socialUrl: "Link do perfil",
  state: "Estado",
  street: "Logradouro",
  termsAccepted: "Termos de Uso",
  tradeName: "Nome fantasia",
  websiteUrl: "Site",
  whatsapp: "WhatsApp",
};

const socialChannelFieldLabels: Record<string, string> = {
  followers: "Número de seguidores",
  interactions: "Interações",
  newFollowers: "Novos seguidores",
  primary: "Rede principal",
  sharedContent: "Conteúdo que você compartilhou",
  url: "Link do perfil",
  views: "Visualizações",
};

function fieldLabel(fieldName: string) {
  if (fieldName.startsWith("additionalLocations.")) {
    return "Localidade adicional";
  }

  if (fieldName.startsWith("socialChannels.")) {
    const suffix = fieldName.split(".").at(-1) ?? "";
    return socialChannelFieldLabels[suffix] ?? "Rede social";
  }

  return fieldLabels[fieldName] ?? "Campo";
}

function focusField(form: HTMLFormElement | null, fieldName: string) {
  const field = form?.querySelector<HTMLElement>(
    `[name="${CSS.escape(fieldName)}"], [data-field-name="${CSS.escape(fieldName)}"]`,
  );

  if (!field) {
    return;
  }

  const focusable = field.matches(
    "input:not([type=hidden]), select, textarea, button",
  )
    ? field
    : field.querySelector<HTMLElement>(
        "input:not([type=hidden]), select, textarea, button, [role=radio], [role=checkbox]",
      );

  focusable?.focus();
}

export function mergeFieldErrors(
  clientErrors: FieldErrors,
  serverErrors?: FieldErrors,
) {
  const fieldNames = new Set([
    ...Object.keys(clientErrors),
    ...Object.keys(serverErrors ?? {}),
  ]);

  return Object.fromEntries(
    [...fieldNames]
      .map((fieldName) => {
        const messages = [
          ...new Set([
            ...(clientErrors[fieldName] ?? []),
            ...(serverErrors?.[fieldName] ?? []),
          ]),
        ];
        return [fieldName, messages] as const;
      })
      .filter(([, messages]) => messages.length > 0),
  );
}

export function FormErrorSummary({ errors }: { errors: FieldErrors }) {
  const entries = Object.entries(errors).filter(
    (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <Alert aria-live="assertive" variant="destructive">
      <CircleAlert aria-hidden="true" />
      <div className="col-start-2">
        <h2 className="font-semibold">Corrija os campos abaixo</h2>
      </div>
      <AlertDescription className="col-start-2">
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {entries.map(([fieldName, messages]) => (
            <li key={fieldName}>
              <button
                className="text-left underline underline-offset-3"
                onClick={(event) =>
                  focusField(event.currentTarget.closest("form"), fieldName)
                }
                type="button"
              >
                {fieldLabel(fieldName)}: {messages[0]}
              </button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
