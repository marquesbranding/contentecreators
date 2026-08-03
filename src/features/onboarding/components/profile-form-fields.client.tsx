"use client";

import { MapPin, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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

import { isValidCnpj, normalizeCnpj } from "../domain/cnpj";
import { useCnpjLookup } from "../hooks/use-cnpj-lookup";
import {
  companySegmentOptions,
  creatorNicheOptions,
  isPredefinedCompanySegment,
  OTHER_NICHE_SLUG,
} from "../domain/profile-segments";
import type {
  CompanyOnboardingDraftPayload,
  CreatorOnboardingDraftPayload,
} from "../schemas/onboarding-draft-schema";
import type { OnboardingDraftPayload } from "../types/onboarding-draft.types";
import { CnpjLookupFeedback } from "./cnpj-lookup-feedback";

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

interface AdditionalLocationEditorValue {
  city: string;
  clientId: string;
  complement: string;
  label: string;
  neighborhood: string;
  number: string;
  postalCode: string;
  state: string;
  street: string;
}

function emptyAdditionalLocation(
  clientId: string,
): AdditionalLocationEditorValue {
  return {
    city: "",
    clientId,
    complement: "",
    label: "",
    neighborhood: "",
    number: "",
    postalCode: "",
    state: "",
    street: "",
  };
}

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
  defaultValue,
  description,
  errors,
  id,
  inputMode,
  label,
  max,
  maxLength,
  min,
  minLength,
  name,
  pattern,
  placeholder,
  required = true,
  step,
  type = "text",
  validate,
  validationMessage,
  value,
  onChange,
}: {
  autoComplete?: string;
  defaultValue?: number | string;
  description?: string;
  errors?: string[];
  id: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  max?: number | string;
  maxLength?: number;
  min?: number | string;
  minLength?: number;
  name: string;
  pattern?: string;
  placeholder?: string;
  required?: boolean;
  step?: number | string;
  type?: React.HTMLInputTypeAttribute;
  validate?: (value: string) => string | null;
  validationMessage?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = errors?.length ? `${id}-error` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  useEffect(() => {
    const input = inputRef.current;

    if (!input || !validate) {
      return;
    }

    input.setCustomValidity(validate(input.value) ?? "");
  }, [defaultValue, validate, value]);

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      <Input
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(errors?.length)}
        autoComplete={autoComplete}
        className="h-12 rounded-xl"
        data-validation-message={validationMessage}
        id={id}
        inputMode={inputMode}
        max={max}
        maxLength={maxLength}
        min={min}
        minLength={minLength}
        name={name}
        pattern={pattern}
        placeholder={placeholder}
        ref={inputRef}
        required={required}
        step={step}
        type={type}
        onInput={(event) => {
          if (validate) {
            event.currentTarget.setCustomValidity(
              validate(event.currentTarget.value) ?? "",
            );
          }
        }}
        onChange={onChange}
        {...(value === undefined ? { defaultValue } : { value })}
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
  initialValue,
  onFieldChange,
  onValueChange,
  required = true,
  validationName,
}: {
  errors?: string[];
  id: string;
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  placeholder: string;
  selectedValue?: string;
  initialValue?: string;
  onFieldChange?: (fieldName: string) => void;
  onValueChange?: (value: string) => void;
  required?: boolean;
  validationName?: string;
}) {
  const [internalValue, setInternalValue] = useState<string | null>(
    initialValue || null,
  );
  const value =
    selectedValue === undefined ? internalValue : selectedValue || null;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <Field data-invalid={Boolean(errors?.length)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Select
        items={Object.fromEntries(options)}
        name={name}
        onValueChange={(nextValue) => {
          setInternalValue(nextValue);
          onValueChange?.(nextValue ?? "");
          onFieldChange?.(validationName ?? name);
        }}
        value={value}
      >
        <SelectTrigger
          aria-describedby={errorId}
          aria-invalid={Boolean(errors?.length)}
          aria-required={required}
          className="h-12 w-full rounded-xl"
          data-field-name={validationName ?? name}
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
  initialValues,
  onFieldChange,
  role,
  showLegalConsents = true,
}: {
  fieldErrors?: Record<string, string[]>;
  getFieldErrors?: (
    fieldName: string,
    serverErrors?: string[],
  ) => string[] | undefined;
  initialValues?: OnboardingDraftPayload;
  onFieldChange?: (fieldName: string) => void;
  role: "INFLUENCER" | "COMPANY";
  showLegalConsents?: boolean;
}) {
  const creatorInitialValues =
    role === "INFLUENCER"
      ? (initialValues as CreatorOnboardingDraftPayload | undefined)
      : undefined;
  const companyInitialValues =
    role === "COMPANY"
      ? (initialValues as CompanyOnboardingDraftPayload | undefined)
      : undefined;
  const [companyFields, setCompanyFields] = useState(() => ({
    city: companyInitialValues?.city ?? "",
    cnpj: companyInitialValues?.cnpj ?? "",
    complement: companyInitialValues?.complement ?? "",
    legalName: companyInitialValues?.legalName ?? "",
    neighborhood: companyInitialValues?.neighborhood ?? "",
    number: companyInitialValues?.number ?? "",
    postalCode: companyInitialValues?.postalCode ?? "",
    segment: companyInitialValues?.segment ?? "",
    state: companyInitialValues?.state ?? "",
    street: companyInitialValues?.street ?? "",
    tradeName: companyInitialValues?.tradeName ?? "",
  }));
  const [companySegmentChoice, setCompanySegmentChoice] = useState(() => {
    const segment = companyInitialValues?.segment ?? "";

    if (!segment) {
      return "";
    }

    return isPredefinedCompanySegment(segment) ? segment : "OTHER";
  });
  const [companySocialPlatform, setCompanySocialPlatform] = useState(
    companyInitialValues?.socialPlatform ?? "",
  );
  const [companySocialUrl, setCompanySocialUrl] = useState(
    companyInitialValues?.socialUrl ?? "",
  );
  const [selectedNicheSlugs, setSelectedNicheSlugs] = useState(
    () => new Set(creatorInitialValues?.nicheSlugs ?? []),
  );
  const otherNicheSelected = selectedNicheSlugs.has(OTHER_NICHE_SLUG);
  const [otherNiche, setOtherNiche] = useState(
    creatorInitialValues?.otherNiche ?? "",
  );
  const nextLocationId = useRef(
    companyInitialValues?.additionalLocations?.length ?? 0,
  );
  const [additionalLocations, setAdditionalLocations] = useState<
    AdditionalLocationEditorValue[]
  >(() =>
    (companyInitialValues?.additionalLocations ?? []).map(
      (location, index) => ({
        ...emptyAdditionalLocation(`initial-${index}`),
        ...location,
      }),
    ),
  );
  const cnpjLookup = useCnpjLookup(
    role === "COMPANY" ? companyFields.cnpj : "",
  );
  const currentCnpjIsValid =
    role === "COMPANY" && isValidCnpj(companyFields.cnpj);
  const automaticallyAppliedCnpj = useRef(
    companyInitialValues?.cnpj?.replace(/\D/gu, "") ?? "",
  );
  const resolveFieldErrors = (fieldName: string) =>
    getFieldErrors?.(fieldName, fieldErrors?.[fieldName]) ??
    fieldErrors?.[fieldName];

  const applyCompanyLookup = useCallback(() => {
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
    setCompanySegmentChoice(
      isPredefinedCompanySegment(result.data.segment)
        ? result.data.segment
        : "OTHER",
    );
  }, [cnpjLookup.data, onFieldChange]);

  useEffect(() => {
    if (cnpjLookup.data?.status !== "success") {
      return;
    }

    const normalizedCnpj = companyFields.cnpj.replace(/\D/gu, "");
    if (
      !normalizedCnpj ||
      automaticallyAppliedCnpj.current === normalizedCnpj
    ) {
      return;
    }

    automaticallyAppliedCnpj.current = normalizedCnpj;
    applyCompanyLookup();
  }, [applyCompanyLookup, cnpjLookup.data, companyFields.cnpj]);

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

  function addAdditionalLocation() {
    const clientId = `new-${nextLocationId.current}`;
    nextLocationId.current += 1;
    setAdditionalLocations((current) => [
      ...current,
      emptyAdditionalLocation(clientId),
    ]);
    onFieldChange?.("additionalLocations");
  }

  function removeAdditionalLocation(clientId: string) {
    setAdditionalLocations((current) =>
      current.filter((location) => location.clientId !== clientId),
    );
    onFieldChange?.("additionalLocations");
  }

  function updateAdditionalLocation(
    clientId: string,
    field: Exclude<keyof AdditionalLocationEditorValue, "clientId">,
    value: string,
  ) {
    setAdditionalLocations((current) =>
      current.map((location) =>
        location.clientId === clientId
          ? { ...location, [field]: value }
          : location,
      ),
    );
    onFieldChange?.("additionalLocations");
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
          {role === "COMPANY" ? (
            <Card className="border-brand-blue/25 bg-brand-blue-soft/35 gap-4 py-5 md:col-span-2">
              <CardHeader className="gap-2 px-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search
                    aria-hidden="true"
                    className="text-brand-blue size-4"
                  />
                  Comece pelo CNPJ
                </CardTitle>
                <FieldDescription>
                  Buscaremos os dados oficiais para preencher razão social, nome
                  fantasia e endereço. Você poderá revisar tudo depois.
                </FieldDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <TextField
                  description="Informe os 14 dígitos do CNPJ."
                  errors={resolveFieldErrors("cnpj")}
                  id="company-cnpj"
                  inputMode="numeric"
                  label="CNPJ"
                  name="cnpj"
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  value={companyFields.cnpj}
                  onChange={updateCompanyField("cnpj")}
                  validate={(value) => {
                    const normalizedCnpj = normalizeCnpj(value);

                    if (!normalizedCnpj) {
                      return null;
                    }

                    if (normalizedCnpj.length !== 14) {
                      return "Informe os 14 dígitos do CNPJ.";
                    }

                    return isValidCnpj(normalizedCnpj)
                      ? null
                      : "CNPJ inválido. Confira os números informados.";
                  }}
                />
                <CnpjLookupFeedback
                  lookupStatus={
                    currentCnpjIsValid ? cnpjLookup.lookupStatus : "idle"
                  }
                  onApply={applyCompanyLookup}
                  onRetry={() => {
                    void cnpjLookup.refetch();
                  }}
                />
              </CardContent>
            </Card>
          ) : null}
          <TextField
            autoComplete="name"
            description="Mínimo de 3 caracteres."
            errors={resolveFieldErrors("legalName")}
            id={`${role.toLowerCase()}-legal-name`}
            label={role === "COMPANY" ? "Razão social" : "Nome completo"}
            name="legalName"
            maxLength={200}
            minLength={3}
            placeholder={
              role === "COMPANY" ? "Empresa Exemplo Ltda." : "Seu nome completo"
            }
            defaultValue={creatorInitialValues?.legalName}
            value={role === "COMPANY" ? companyFields.legalName : undefined}
            onChange={
              role === "COMPANY" ? updateCompanyField("legalName") : undefined
            }
            validationMessage="Use pelo menos 3 caracteres."
          />

          {role === "COMPANY" ? (
            <>
              <TextField
                description="Mínimo de 2 caracteres."
                errors={resolveFieldErrors("tradeName")}
                id="company-trade-name"
                label="Nome fantasia"
                name="tradeName"
                maxLength={160}
                minLength={2}
                placeholder="Nome conhecido pelo público"
                value={companyFields.tradeName}
                onChange={updateCompanyField("tradeName")}
                validationMessage="Use pelo menos 2 caracteres."
              />
              <ControlledSelect
                errors={
                  companySegmentChoice === "OTHER"
                    ? undefined
                    : resolveFieldErrors("segment")
                }
                id="company-segment-choice"
                label="Segmento"
                name="segmentChoice"
                onFieldChange={onFieldChange}
                onValueChange={(value) => {
                  setCompanySegmentChoice(value);
                  setCompanyFields((current) => ({
                    ...current,
                    segment: value === "OTHER" ? "" : value,
                  }));
                }}
                options={companySegmentOptions}
                placeholder="Selecione o segmento"
                selectedValue={companySegmentChoice}
                validationName="segment"
              />
              {companySegmentChoice === "OTHER" ? (
                <TextField
                  description="Mínimo de 2 caracteres."
                  errors={resolveFieldErrors("segment")}
                  id="company-other-segment"
                  label="Qual é o segmento?"
                  name="segment"
                  maxLength={120}
                  minLength={2}
                  onChange={updateCompanyField("segment")}
                  placeholder="Ex.: Economia criativa"
                  value={companyFields.segment}
                  validationMessage="Use pelo menos 2 caracteres."
                />
              ) : (
                <input
                  name="segment"
                  type="hidden"
                  value={companyFields.segment}
                />
              )}
              <ControlledSelect
                errors={resolveFieldErrors("employeeRange")}
                id="company-employee-range"
                label="Tamanho da empresa"
                name="employeeRange"
                initialValue={companyInitialValues?.employeeRange}
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
                defaultValue={creatorInitialValues?.displayName}
                description="Mínimo de 2 caracteres."
                errors={resolveFieldErrors("displayName")}
                id="creator-display-name"
                label="Nome de creator"
                name="displayName"
                maxLength={120}
                minLength={2}
                placeholder="Como você quer aparecer"
                validationMessage="Use pelo menos 2 caracteres."
              />
              <ControlledSelect
                errors={resolveFieldErrors("creatorType")}
                id="creator-type"
                label="Tipo de atuação"
                name="creatorType"
                initialValue={creatorInitialValues?.creatorType}
                options={[
                  ["INFLUENCER", "Influencer"],
                  ["UGC", "Creator UGC"],
                ]}
                onFieldChange={onFieldChange}
                placeholder="Selecione uma opção"
              />
              <TextField
                defaultValue={creatorInitialValues?.followers}
                errors={resolveFieldErrors("followers")}
                id="creator-followers"
                inputMode="numeric"
                label="Número de seguidores"
                min={0}
                name="followers"
                placeholder="Ex.: 12500"
                type="number"
              />
              <TextField
                defaultValue={creatorInitialValues?.engagementRate}
                errors={resolveFieldErrors("engagementRate")}
                id="creator-engagement"
                inputMode="decimal"
                label="Taxa de engajamento (%)"
                max={100}
                min={0}
                name="engagementRate"
                placeholder="Ex.: 4,25"
                step="0.01"
                type="number"
              />
            </>
          )}

          <TextField
            autoComplete="tel"
            description="Mínimo de 10 caracteres, incluindo o DDD."
            errors={resolveFieldErrors("whatsapp")}
            id={`${role.toLowerCase()}-whatsapp`}
            inputMode="tel"
            label="WhatsApp com DDD"
            name="whatsapp"
            maxLength={20}
            minLength={10}
            placeholder="(11) 99999-9999"
            type="tel"
            defaultValue={
              role === "COMPANY"
                ? companyInitialValues?.whatsapp
                : creatorInitialValues?.whatsapp
            }
            validationMessage="Informe um WhatsApp com DDD."
          />

          {role === "COMPANY" ? (
            <>
              <TextField
                autoComplete="url"
                errors={resolveFieldErrors("websiteUrl")}
                id="company-website"
                inputMode="url"
                label="Site (opcional)"
                maxLength={2_000}
                name="websiteUrl"
                placeholder="https://suaempresa.com.br"
                required={false}
                type="url"
                defaultValue={companyInitialValues?.websiteUrl}
              />
              <ControlledSelect
                errors={resolveFieldErrors("socialPlatform")}
                id="company-social-platform"
                label={
                  companySocialUrl && !companySocialPlatform
                    ? "Rede social"
                    : "Rede social (opcional)"
                }
                name="socialPlatform"
                onFieldChange={onFieldChange}
                onValueChange={setCompanySocialPlatform}
                options={[
                  ["INSTAGRAM", "Instagram"],
                  ["TIKTOK", "TikTok"],
                  ["YOUTUBE", "YouTube"],
                  ["FACEBOOK", "Facebook"],
                  ["X", "X"],
                  ["LINKEDIN", "LinkedIn"],
                  ["OTHER", "Outra"],
                ]}
                placeholder="Selecione uma rede"
                required={Boolean(companySocialUrl && !companySocialPlatform)}
                selectedValue={companySocialPlatform}
              />
              <TextField
                autoComplete="url"
                errors={resolveFieldErrors("socialUrl")}
                id="company-social-url"
                inputMode="url"
                label={
                  companySocialPlatform && !companySocialUrl
                    ? "Link da rede social"
                    : "Link da rede social (opcional)"
                }
                maxLength={2_000}
                name="socialUrl"
                onChange={(event) => {
                  setCompanySocialUrl(event.target.value);
                  onFieldChange?.("socialUrl");
                }}
                placeholder="https://linkedin.com/company/suaempresa"
                required={Boolean(companySocialPlatform && !companySocialUrl)}
                type="url"
                value={companySocialUrl}
              />
            </>
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
          <FieldDescription id={`${role.toLowerCase()}-description-help`}>
            Mínimo de 30 caracteres. Máximo de{" "}
            {role === "COMPANY" ? "3.000" : "2.000"}.
          </FieldDescription>
          <Textarea
            aria-describedby={`${role.toLowerCase()}-description-help ${role.toLowerCase()}-description-error`}
            aria-invalid={Boolean(
              resolveFieldErrors(role === "COMPANY" ? "description" : "bio")
                ?.length,
            )}
            className="min-h-32 rounded-xl"
            data-validation-message="Use pelo menos 30 caracteres."
            defaultValue={
              role === "COMPANY"
                ? companyInitialValues?.description
                : creatorInitialValues?.bio
            }
            id={`${role.toLowerCase()}-description`}
            maxLength={role === "COMPANY" ? 3_000 : 2_000}
            minLength={30}
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
              initialValue={creatorInitialValues?.socialPlatform}
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
              defaultValue={creatorInitialValues?.socialUrl}
              errors={resolveFieldErrors("socialUrl")}
              id="creator-social-url"
              inputMode="url"
              label="Link do perfil"
              maxLength={2_000}
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
            <FieldDescription>
              Selecione de 1 a 5 nichos que melhor representam seu conteúdo.
            </FieldDescription>
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
              {creatorNicheOptions.map(([value, label]) => (
                <label
                  className="bg-card hover:border-brand-blue/40 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
                  key={value}
                >
                  <Checkbox
                    aria-describedby="creator-niches-error"
                    aria-invalid={Boolean(
                      resolveFieldErrors("nicheSlugs")?.length,
                    )}
                    checked={selectedNicheSlugs.has(value)}
                    disabled={
                      selectedNicheSlugs.size >= 5 &&
                      !selectedNicheSlugs.has(value)
                    }
                    name="nicheSlugs"
                    onCheckedChange={(checked) => {
                      setSelectedNicheSlugs((current) => {
                        const next = new Set(current);
                        if (checked) {
                          next.add(value);
                        } else {
                          next.delete(value);
                        }
                        return next;
                      });
                      if (value === OTHER_NICHE_SLUG) {
                        if (!checked) {
                          setOtherNiche("");
                          onFieldChange?.("otherNiche");
                        }
                      }
                      onFieldChange?.("nicheSlugs");
                    }}
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
          {otherNicheSelected ? (
            <TextField
              description="Mínimo de 2 caracteres."
              errors={resolveFieldErrors("otherNiche")}
              id="creator-other-niche"
              label="Qual é o outro nicho?"
              name="otherNiche"
              maxLength={120}
              minLength={2}
              onChange={(event) => {
                setOtherNiche(event.target.value);
                onFieldChange?.("otherNiche");
              }}
              placeholder="Ex.: Artesanato sustentável"
              value={otherNiche}
              validationMessage="Use pelo menos 2 caracteres."
            />
          ) : null}
        </FieldSet>
      ) : (
        <FieldSet>
          <FieldLegend>Localidades da empresa</FieldLegend>
          <FieldDescription>
            A sede permanece como localização principal. Os dados sugeridos pelo
            CNPJ continuam editáveis, e você pode cadastrar até nove localidades
            adicionais.
          </FieldDescription>
          <input name="additionalLocationsPresent" type="hidden" value="true" />
          <Badge className="w-fit gap-1.5" variant="secondary">
            <MapPin aria-hidden="true" />
            Localização principal
          </Badge>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <TextField
              autoComplete="postal-code"
              description="Informe os 8 dígitos do CEP."
              errors={resolveFieldErrors("postalCode")}
              id="company-postal-code"
              inputMode="numeric"
              label="CEP"
              name="postalCode"
              maxLength={9}
              minLength={8}
              pattern="(?:[0-9]{8}|[0-9]{5}-[0-9]{3})"
              placeholder="00000-000"
              value={companyFields.postalCode}
              onChange={updateCompanyField("postalCode")}
              validationMessage="Informe um CEP válido com 8 dígitos."
            />
            <TextField
              autoComplete="address-line1"
              description="Mínimo de 3 caracteres."
              errors={resolveFieldErrors("street")}
              id="company-street"
              label="Logradouro"
              name="street"
              maxLength={180}
              minLength={3}
              value={companyFields.street}
              onChange={updateCompanyField("street")}
              validationMessage="Use pelo menos 3 caracteres."
            />
            <TextField
              errors={resolveFieldErrors("number")}
              id="company-number"
              label="Número"
              maxLength={30}
              name="number"
              value={companyFields.number}
              onChange={updateCompanyField("number")}
            />
            <TextField
              autoComplete="address-line2"
              errors={resolveFieldErrors("complement")}
              id="company-complement"
              label="Complemento (opcional)"
              maxLength={120}
              name="complement"
              required={false}
              value={companyFields.complement}
              onChange={updateCompanyField("complement")}
            />
            <TextField
              description="Mínimo de 2 caracteres."
              errors={resolveFieldErrors("neighborhood")}
              id="company-neighborhood"
              label="Bairro"
              name="neighborhood"
              maxLength={120}
              minLength={2}
              value={companyFields.neighborhood}
              onChange={updateCompanyField("neighborhood")}
              validationMessage="Use pelo menos 2 caracteres."
            />
          </FieldGroup>

          {additionalLocations.length > 0 ? (
            <div className="grid gap-4">
              {additionalLocations.map((location, index) => {
                const namePrefix = `additionalLocations.${location.clientId}`;
                const idPrefix = `company-location-${location.clientId}`;

                return (
                  <Card className="gap-4 py-5" key={location.clientId}>
                    <CardHeader className="flex-row items-center justify-between gap-3 px-5">
                      <CardTitle className="text-base">
                        Localidade adicional {index + 1}
                      </CardTitle>
                      <Button
                        aria-label={`Remover localidade ${index + 1}`}
                        onClick={() =>
                          removeAdditionalLocation(location.clientId)
                        }
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid gap-5 px-5 md:grid-cols-2">
                      <TextField
                        description="Mínimo de 2 caracteres."
                        errors={resolveFieldErrors("additionalLocations")}
                        id={`${idPrefix}-label`}
                        label="Nome da localidade"
                        name={`${namePrefix}.label`}
                        maxLength={80}
                        minLength={2}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "label",
                            event.target.value,
                          )
                        }
                        placeholder="Ex.: Filial Sul"
                        value={location.label}
                        validationMessage="Use pelo menos 2 caracteres."
                      />
                      <TextField
                        autoComplete="postal-code"
                        description="Informe os 8 dígitos do CEP."
                        id={`${idPrefix}-postal-code`}
                        inputMode="numeric"
                        label="CEP da localidade"
                        name={`${namePrefix}.postalCode`}
                        maxLength={9}
                        minLength={8}
                        pattern="(?:[0-9]{8}|[0-9]{5}-[0-9]{3})"
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "postalCode",
                            event.target.value,
                          )
                        }
                        placeholder="00000-000"
                        value={location.postalCode}
                        validationMessage="Informe um CEP válido com 8 dígitos."
                      />
                      <TextField
                        autoComplete="address-line1"
                        description="Mínimo de 3 caracteres."
                        id={`${idPrefix}-street`}
                        label="Logradouro da localidade"
                        name={`${namePrefix}.street`}
                        maxLength={180}
                        minLength={3}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "street",
                            event.target.value,
                          )
                        }
                        value={location.street}
                        validationMessage="Use pelo menos 3 caracteres."
                      />
                      <TextField
                        id={`${idPrefix}-number`}
                        label="Número da localidade"
                        maxLength={30}
                        name={`${namePrefix}.number`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "number",
                            event.target.value,
                          )
                        }
                        value={location.number}
                      />
                      <TextField
                        autoComplete="address-line2"
                        id={`${idPrefix}-complement`}
                        label="Complemento da localidade (opcional)"
                        maxLength={120}
                        name={`${namePrefix}.complement`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "complement",
                            event.target.value,
                          )
                        }
                        required={false}
                        value={location.complement}
                      />
                      <TextField
                        description="Mínimo de 2 caracteres."
                        id={`${idPrefix}-neighborhood`}
                        label="Bairro da localidade"
                        name={`${namePrefix}.neighborhood`}
                        maxLength={120}
                        minLength={2}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "neighborhood",
                            event.target.value,
                          )
                        }
                        value={location.neighborhood}
                        validationMessage="Use pelo menos 2 caracteres."
                      />
                      <TextField
                        autoComplete="address-level2"
                        description="Mínimo de 2 caracteres."
                        id={`${idPrefix}-city`}
                        label="Cidade da localidade"
                        name={`${namePrefix}.city`}
                        maxLength={120}
                        minLength={2}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "city",
                            event.target.value,
                          )
                        }
                        value={location.city}
                        validationMessage="Use pelo menos 2 caracteres."
                      />
                      <ControlledSelect
                        id={`${idPrefix}-state`}
                        label="UF da localidade"
                        name={`${namePrefix}.state`}
                        onFieldChange={() =>
                          onFieldChange?.("additionalLocations")
                        }
                        onValueChange={(value) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "state",
                            value,
                          )
                        }
                        options={states.map((state) => [state, state] as const)}
                        placeholder="UF"
                        selectedValue={location.state}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}

          <Button
            className="w-fit"
            disabled={additionalLocations.length >= 9}
            onClick={addAdditionalLocation}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" />
            Adicionar localidade
          </Button>
        </FieldSet>
      )}

      <FieldSet>
        <FieldLegend>Localização</FieldLegend>
        <FieldGroup className="grid gap-5 md:grid-cols-[1fr_10rem]">
          <TextField
            autoComplete="address-level2"
            description="Mínimo de 2 caracteres."
            errors={resolveFieldErrors("city")}
            id={`${role.toLowerCase()}-city`}
            label="Cidade"
            name="city"
            maxLength={120}
            minLength={2}
            defaultValue={creatorInitialValues?.city}
            value={role === "COMPANY" ? companyFields.city : undefined}
            onChange={
              role === "COMPANY" ? updateCompanyField("city") : undefined
            }
            validationMessage="Use pelo menos 2 caracteres."
          />
          <ControlledSelect
            errors={resolveFieldErrors("state")}
            id={`${role.toLowerCase()}-state`}
            label="UF"
            name="state"
            initialValue={creatorInitialValues?.state}
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

      {showLegalConsents ? (
        <FieldSet>
          <FieldLegend>Termos e privacidade</FieldLegend>
          <FieldGroup>
            <Field
              data-invalid={Boolean(
                resolveFieldErrors("termsAccepted")?.length,
              )}
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
                  defaultChecked={false}
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
                  defaultChecked={false}
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
            {role === "INFLUENCER" ? (
              <Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                  <Checkbox
                    data-field-kind="checkbox"
                    data-field-name="contactVisibilityAccepted"
                    defaultChecked={false}
                    name="contactVisibilityAccepted"
                    onCheckedChange={() =>
                      onFieldChange?.("contactVisibilityAccepted")
                    }
                  />
                  <span className="text-sm leading-6">
                    Autorizo que empresas aprovadas visualizem meus canais de
                    contato para falar comigo sobre oportunidades. Essa
                    autorização é opcional e começa desmarcada.
                  </span>
                </label>
              </Field>
            ) : null}
          </FieldGroup>
        </FieldSet>
      ) : null}
    </>
  );
}
