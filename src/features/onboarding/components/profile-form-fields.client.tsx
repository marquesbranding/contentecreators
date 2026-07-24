"use client";

import Link from "next/link";
import { useState } from "react";

import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  RequiredIndicator,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { useCnpjLookup } from "../hooks/use-cnpj-lookup";
import { CnpjLookupFeedback } from "./cnpj-lookup-feedback";

const niches = [
  ["beleza", "Beleza"],
  ["gastronomia", "Gastronomia"],
  ["moda", "Moda"],
  ["tecnologia", "Tecnologia"],
  ["viagem", "Viagem"],
] as const;

const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

function ErrorMessages({ errors, id }: { errors?: string[]; id: string }) {
  return (
    <FieldError id={id}>
      {errors?.map((message) => (
        <span className="block" key={message}>
          {message}
        </span>
      ))}
    </FieldError>
  );
}

function TextField({
  autoComplete,
  errors,
  id,
  inputMode,
  label,
  name,
  placeholder,
  required = true,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  errors?: string[];
  id: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        aria-describedby={errorId}
        aria-invalid={Boolean(errors?.length)}
        autoComplete={autoComplete}
        className="h-12 rounded-xl"
        id={id}
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
      />
      <ErrorMessages errors={errors} id={errorId ?? `${id}-error`} />
    </Field>
  );
}

function ControlledSelect({
  errors,
  id,
  label,
  name,
  options,
  placeholder,
  selectedValue,
  onFieldChange,
  onValueChange,
  required = true,
}: {
  errors?: string[];
  id: string;
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  placeholder: string;
  selectedValue?: string;
  onFieldChange?: (fieldName: string) => void;
  onValueChange?: (value: string) => void;
  required?: boolean;
}) {
  const [internalValue, setInternalValue] = useState<string | null>(null);
  const value =
    selectedValue === undefined ? internalValue : selectedValue || null;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Select
        name={name}
        onValueChange={(nextValue) => {
          setInternalValue(nextValue);
          onValueChange?.(nextValue ?? "");
          onFieldChange?.(name);
        }}
        value={value}
      >
        <SelectTrigger
          aria-describedby={errorId}
          aria-invalid={Boolean(errors?.length)}
          aria-required={required}
          className="h-12 w-full rounded-xl"
          data-field-name={name}
          data-field-value={value ?? ""}
          data-required-field={required}
          data-required-message="Selecione uma opção."
          id={id}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorMessages errors={errors} id={errorId ?? `${id}-error`} />
    </Field>
  );
}

export function ProfileFormFields({
  fieldErrors,
  getFieldErrors,
  onFieldChange,
  role,
}: {
  fieldErrors?: Record<string, string[]>;
  getFieldErrors?: (
    fieldName: string,
    serverErrors?: string[],
  ) => string[] | undefined;
  onFieldChange?: (fieldName: string) => void;
  role: "INFLUENCER" | "COMPANY";
}) {
  const [companyFields, setCompanyFields] = useState({
    city: "",
    cnpj: "",
    complement: "",
    legalName: "",
    neighborhood: "",
    number: "",
    postalCode: "",
    segment: "",
    state: "",
    street: "",
    tradeName: "",
  });
  const cnpjLookup = useCnpjLookup(
    role === "COMPANY" ? companyFields.cnpj : "",
  );
  const resolveFieldErrors = (fieldName: string) =>
    getFieldErrors?.(fieldName, fieldErrors?.[fieldName]) ??
    fieldErrors?.[fieldName];

  function applyCompanyLookup() {
    const result = cnpjLookup.data;

    if (result?.status !== "success") {
      return;
    }

    for (const fieldName of Object.keys(result.data)) {
      onFieldChange?.(fieldName);
    }

    setCompanyFields((current) => ({
      ...current,
      ...result.data,
      cnpj: current.cnpj,
    }));
  }

  function updateCompanyField(
    field: keyof typeof companyFields,
  ): React.ChangeEventHandler<HTMLInputElement> {
    return (event) => {
      onFieldChange?.(field);
      setCompanyFields((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  return (
    <>
      <FieldSet>
        <FieldLegend>
          {role === "COMPANY" ? "Dados da empresa" : "Seu perfil de creator"}
        </FieldLegend>
        <FieldDescription>
          Estas informações serão avaliadas pela equipe antes de liberar o
          catálogo.
        </FieldDescription>
        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <TextField
            autoComplete="name"
            errors={resolveFieldErrors("legalName")}
            id={`${role.toLowerCase()}-legal-name`}
            label={role === "COMPANY" ? "Razão social" : "Nome completo"}
            name="legalName"
            placeholder={
              role === "COMPANY" ? "Empresa Exemplo Ltda." : "Seu nome completo"
            }
            value={role === "COMPANY" ? companyFields.legalName : undefined}
            onChange={
              role === "COMPANY" ? updateCompanyField("legalName") : undefined
            }
          />

          {role === "COMPANY" ? (
            <>
              <TextField
                errors={resolveFieldErrors("tradeName")}
                id="company-trade-name"
                label="Nome fantasia"
                name="tradeName"
                placeholder="Nome conhecido pelo público"
                value={companyFields.tradeName}
                onChange={updateCompanyField("tradeName")}
              />
              <TextField
                errors={resolveFieldErrors("cnpj")}
                id="company-cnpj"
                inputMode="numeric"
                label="CNPJ"
                name="cnpj"
                placeholder="00.000.000/0000-00"
                value={companyFields.cnpj}
                onChange={updateCompanyField("cnpj")}
              />
              <div className="md:col-span-2">
                <CnpjLookupFeedback
                  lookupStatus={cnpjLookup.lookupStatus}
                  onApply={applyCompanyLookup}
                  onRetry={() => {
                    void cnpjLookup.refetch();
                  }}
                />
              </div>
              <TextField
                errors={resolveFieldErrors("segment")}
                id="company-segment"
                label="Segmento"
                name="segment"
                placeholder="Ex.: Tecnologia"
                value={companyFields.segment}
                onChange={updateCompanyField("segment")}
              />
              <ControlledSelect
                errors={resolveFieldErrors("employeeRange")}
                id="company-employee-range"
                label="Tamanho da empresa"
                name="employeeRange"
                options={[
                  ["UP_TO_10", "Até 10 pessoas"],
                  ["11_TO_50", "11 a 50 pessoas"],
                  ["51_TO_200", "51 a 200 pessoas"],
                  ["201_TO_500", "201 a 500 pessoas"],
                  ["MORE_THAN_500", "Mais de 500 pessoas"],
                ]}
                onFieldChange={onFieldChange}
                placeholder="Selecione uma faixa"
              />
            </>
          ) : (
            <>
              <TextField
                errors={resolveFieldErrors("displayName")}
                id="creator-display-name"
                label="Nome de creator"
                name="displayName"
                placeholder="Como você quer aparecer"
              />
              <ControlledSelect
                errors={resolveFieldErrors("creatorType")}
                id="creator-type"
                label="Tipo de atuação"
                name="creatorType"
                options={[
                  ["INFLUENCER", "Influencer"],
                  ["UGC", "Creator UGC"],
                ]}
                onFieldChange={onFieldChange}
                placeholder="Selecione uma opção"
              />
              <TextField
                errors={resolveFieldErrors("followers")}
                id="creator-followers"
                inputMode="numeric"
                label="Número de seguidores"
                name="followers"
                placeholder="Ex.: 12500"
                type="number"
              />
              <TextField
                errors={resolveFieldErrors("engagementRate")}
                id="creator-engagement"
                inputMode="decimal"
                label="Taxa de engajamento (%)"
                name="engagementRate"
                placeholder="Ex.: 4,25"
                type="number"
              />
            </>
          )}

          <TextField
            autoComplete="tel"
            errors={resolveFieldErrors("whatsapp")}
            id={`${role.toLowerCase()}-whatsapp`}
            inputMode="tel"
            label="WhatsApp com DDD"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            type="tel"
          />

          {role === "COMPANY" ? (
            <TextField
              autoComplete="url"
              errors={resolveFieldErrors("websiteUrl")}
              id="company-website"
              inputMode="url"
              label="Site (opcional)"
              name="websiteUrl"
              placeholder="https://suaempresa.com.br"
              required={false}
              type="url"
            />
          ) : null}
        </FieldGroup>

        <Field
          data-invalid={Boolean(
            resolveFieldErrors(role === "COMPANY" ? "description" : "bio")
              ?.length,
          )}
        >
          <FieldLabel htmlFor={`${role.toLowerCase()}-description`} required>
            {role === "COMPANY"
              ? "Apresente a empresa"
              : "Conte sobre seu conteúdo"}
          </FieldLabel>
          <Textarea
            aria-describedby={`${role.toLowerCase()}-description-error`}
            aria-invalid={Boolean(
              resolveFieldErrors(role === "COMPANY" ? "description" : "bio")
                ?.length,
            )}
            className="min-h-32 rounded-xl"
            id={`${role.toLowerCase()}-description`}
            name={role === "COMPANY" ? "description" : "bio"}
            placeholder={
              role === "COMPANY"
                ? "Conte sobre a marca e os tipos de parceria que procura."
                : "Conte sobre sua audiência, seus temas e seu estilo de conteúdo."
            }
            required
          />
          <ErrorMessages
            errors={
              role === "COMPANY"
                ? resolveFieldErrors("description")
                : resolveFieldErrors("bio")
            }
            id={`${role.toLowerCase()}-description-error`}
          />
        </Field>
      </FieldSet>

      {role === "INFLUENCER" ? (
        <FieldSet>
          <FieldLegend>Audiência e canais</FieldLegend>
          <FieldDescription>
            Os números são autodeclarados e serão identificados dessa forma no
            catálogo.
          </FieldDescription>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <ControlledSelect
              errors={resolveFieldErrors("socialPlatform")}
              id="creator-social-platform"
              label="Canal principal"
              name="socialPlatform"
              options={[
                ["INSTAGRAM", "Instagram"],
                ["TIKTOK", "TikTok"],
                ["YOUTUBE", "YouTube"],
                ["FACEBOOK", "Facebook"],
                ["X", "X"],
                ["LINKEDIN", "LinkedIn"],
                ["OTHER", "Outro"],
              ]}
              onFieldChange={onFieldChange}
              placeholder="Selecione uma rede"
            />
            <TextField
              errors={resolveFieldErrors("socialUrl")}
              id="creator-social-url"
              inputMode="url"
              label="Link do perfil"
              name="socialUrl"
              placeholder="https://instagram.com/seuperfil"
              type="url"
            />
          </FieldGroup>
          <Field
            data-invalid={Boolean(resolveFieldErrors("nicheSlugs")?.length)}
          >
            <FieldLabel id="creator-niches-label" required>
              Principais nichos
            </FieldLabel>
            <div
              aria-describedby="creator-niches-error"
              aria-labelledby="creator-niches-label"
              className="data-[invalid=true]:ring-destructive/20 grid gap-3 data-[invalid=true]:rounded-xl data-[invalid=true]:ring-3 sm:grid-cols-2 lg:grid-cols-3"
              data-field-kind="checkbox-group"
              data-field-name="nicheSlugs"
              data-invalid={Boolean(resolveFieldErrors("nicheSlugs")?.length)}
              data-required-field="true"
              data-required-message="Escolha pelo menos um nicho."
              role="group"
            >
              {niches.map(([value, label]) => (
                <label
                  className="bg-card hover:border-brand-blue/40 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
                  key={value}
                >
                  <Checkbox
                    aria-describedby="creator-niches-error"
                    aria-invalid={Boolean(
                      resolveFieldErrors("nicheSlugs")?.length,
                    )}
                    name="nicheSlugs"
                    onCheckedChange={() => onFieldChange?.("nicheSlugs")}
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
            <ErrorMessages
              errors={resolveFieldErrors("nicheSlugs")}
              id="creator-niches-error"
            />
          </Field>
        </FieldSet>
      ) : (
        <FieldSet>
          <FieldLegend>Endereço principal</FieldLegend>
          <FieldDescription>
            O endereço pode ser preenchido automaticamente a partir do CNPJ e
            sempre poderá ser revisado antes do envio.
          </FieldDescription>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <TextField
              autoComplete="postal-code"
              errors={resolveFieldErrors("postalCode")}
              id="company-postal-code"
              inputMode="numeric"
              label="CEP"
              name="postalCode"
              placeholder="00000-000"
              value={companyFields.postalCode}
              onChange={updateCompanyField("postalCode")}
            />
            <TextField
              autoComplete="address-line1"
              errors={resolveFieldErrors("street")}
              id="company-street"
              label="Logradouro"
              name="street"
              value={companyFields.street}
              onChange={updateCompanyField("street")}
            />
            <TextField
              errors={resolveFieldErrors("number")}
              id="company-number"
              label="Número"
              name="number"
              value={companyFields.number}
              onChange={updateCompanyField("number")}
            />
            <TextField
              autoComplete="address-line2"
              errors={resolveFieldErrors("complement")}
              id="company-complement"
              label="Complemento (opcional)"
              name="complement"
              required={false}
              value={companyFields.complement}
              onChange={updateCompanyField("complement")}
            />
            <TextField
              errors={resolveFieldErrors("neighborhood")}
              id="company-neighborhood"
              label="Bairro"
              name="neighborhood"
              value={companyFields.neighborhood}
              onChange={updateCompanyField("neighborhood")}
            />
          </FieldGroup>
        </FieldSet>
      )}

      <FieldSet>
        <FieldLegend>Localização</FieldLegend>
        <FieldGroup className="grid gap-5 md:grid-cols-[1fr_10rem]">
          <TextField
            autoComplete="address-level2"
            errors={resolveFieldErrors("city")}
            id={`${role.toLowerCase()}-city`}
            label="Cidade"
            name="city"
            value={role === "COMPANY" ? companyFields.city : undefined}
            onChange={
              role === "COMPANY" ? updateCompanyField("city") : undefined
            }
          />
          <ControlledSelect
            errors={resolveFieldErrors("state")}
            id={`${role.toLowerCase()}-state`}
            label="UF"
            name="state"
            options={states.map((state) => [state, state] as const)}
            onFieldChange={onFieldChange}
            placeholder="UF"
            selectedValue={role === "COMPANY" ? companyFields.state : undefined}
            onValueChange={
              role === "COMPANY"
                ? (value) =>
                    setCompanyFields((current) => ({
                      ...current,
                      state: value,
                    }))
                : undefined
            }
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Termos e privacidade</FieldLegend>
        <FieldGroup>
          <Field
            data-invalid={Boolean(resolveFieldErrors("termsAccepted")?.length)}
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
              <Checkbox
                aria-describedby="terms-accepted-error"
                aria-invalid={Boolean(
                  resolveFieldErrors("termsAccepted")?.length,
                )}
                aria-required="true"
                data-field-kind="checkbox"
                data-field-name="termsAccepted"
                data-required-field="true"
                data-required-message="Você precisa aceitar para continuar."
                name="termsAccepted"
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldChange?.("termsAccepted");
                  }
                }}
              />
              <span className="text-sm leading-6">
                Li e aceito os{" "}
                <Link
                  className="text-brand-blue font-semibold underline"
                  href="/terms"
                  target="_blank"
                >
                  Termos de Uso
                </Link>
                <RequiredIndicator />.
              </span>
            </label>
            <ErrorMessages
              errors={resolveFieldErrors("termsAccepted")}
              id="terms-accepted-error"
            />
          </Field>
          <Field
            data-invalid={Boolean(
              resolveFieldErrors("privacyAccepted")?.length,
            )}
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
              <Checkbox
                aria-describedby="privacy-accepted-error"
                aria-invalid={Boolean(
                  resolveFieldErrors("privacyAccepted")?.length,
                )}
                aria-required="true"
                data-field-kind="checkbox"
                data-field-name="privacyAccepted"
                data-required-field="true"
                data-required-message="Você precisa aceitar para continuar."
                name="privacyAccepted"
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldChange?.("privacyAccepted");
                  }
                }}
              />
              <span className="text-sm leading-6">
                Li e aceito a{" "}
                <Link
                  className="text-brand-blue font-semibold underline"
                  href="/privacy"
                  target="_blank"
                >
                  Política de Privacidade
                </Link>
                <RequiredIndicator />.
              </span>
            </label>
            <ErrorMessages
              errors={resolveFieldErrors("privacyAccepted")}
              id="privacy-accepted-error"
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </>
  );
}
