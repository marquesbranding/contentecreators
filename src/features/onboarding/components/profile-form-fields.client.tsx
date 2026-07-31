"use client";

import { MapPin, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

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
  errors,
  id,
  inputMode,
  label,
  max,
  min,
  name,
  placeholder,
  required = true,
  step,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  defaultValue?: number | string;
  errors?: string[];
  id: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  max?: number | string;
  min?: number | string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: number | string;
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
        max={max}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
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
    setCompanySegmentChoice(
      isPredefinedCompanySegment(result.data.segment)
        ? result.data.segment
        : "OTHER",
    );
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
          <TextField
            autoComplete="name"
            errors={resolveFieldErrors("legalName")}
            id={`${role.toLowerCase()}-legal-name`}
            label={role === "COMPANY" ? "Razão social" : "Nome completo"}
            name="legalName"
            placeholder={
              role === "COMPANY" ? "Empresa Exemplo Ltda." : "Seu nome completo"
            }
            defaultValue={creatorInitialValues?.legalName}
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
                  errors={resolveFieldErrors("segment")}
                  id="company-other-segment"
                  label="Qual é o segmento?"
                  name="segment"
                  onChange={updateCompanyField("segment")}
                  placeholder="Ex.: Economia criativa"
                  value={companyFields.segment}
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
            errors={resolveFieldErrors("whatsapp")}
            id={`${role.toLowerCase()}-whatsapp`}
            inputMode="tel"
            label="WhatsApp com DDD"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            type="tel"
            defaultValue={
              role === "COMPANY"
                ? companyInitialValues?.whatsapp
                : creatorInitialValues?.whatsapp
            }
          />

          {role === "COMPANY" ? (
            <>
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
                defaultValue={companyInitialValues?.websiteUrl}
              />
              <ControlledSelect
                errors={resolveFieldErrors("socialPlatform")}
                id="company-social-platform"
                initialValue={companyInitialValues?.socialPlatform}
                label="Rede social (opcional)"
                name="socialPlatform"
                onFieldChange={onFieldChange}
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
                required={false}
              />
              <TextField
                autoComplete="url"
                defaultValue={companyInitialValues?.socialUrl}
                errors={resolveFieldErrors("socialUrl")}
                id="company-social-url"
                inputMode="url"
                label="Link da rede social (opcional)"
                name="socialUrl"
                placeholder="https://linkedin.com/company/suaempresa"
                required={false}
                type="url"
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
          <Textarea
            aria-describedby={`${role.toLowerCase()}-description-error`}
            aria-invalid={Boolean(
              resolveFieldErrors(role === "COMPANY" ? "description" : "bio")
                ?.length,
            )}
            className="min-h-32 rounded-xl"
            defaultValue={
              role === "COMPANY"
                ? companyInitialValues?.description
                : creatorInitialValues?.bio
            }
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
              errors={resolveFieldErrors("otherNiche")}
              id="creator-other-niche"
              label="Qual é o outro nicho?"
              name="otherNiche"
              onChange={(event) => {
                setOtherNiche(event.target.value);
                onFieldChange?.("otherNiche");
              }}
              placeholder="Ex.: Artesanato sustentável"
              value={otherNiche}
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
                        errors={resolveFieldErrors("additionalLocations")}
                        id={`${idPrefix}-label`}
                        label="Nome da localidade"
                        name={`${namePrefix}.label`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "label",
                            event.target.value,
                          )
                        }
                        placeholder="Ex.: Filial Sul"
                        value={location.label}
                      />
                      <TextField
                        autoComplete="postal-code"
                        id={`${idPrefix}-postal-code`}
                        inputMode="numeric"
                        label="CEP da localidade"
                        name={`${namePrefix}.postalCode`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "postalCode",
                            event.target.value,
                          )
                        }
                        placeholder="00000-000"
                        value={location.postalCode}
                      />
                      <TextField
                        autoComplete="address-line1"
                        id={`${idPrefix}-street`}
                        label="Logradouro da localidade"
                        name={`${namePrefix}.street`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "street",
                            event.target.value,
                          )
                        }
                        value={location.street}
                      />
                      <TextField
                        id={`${idPrefix}-number`}
                        label="Número da localidade"
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
                        id={`${idPrefix}-neighborhood`}
                        label="Bairro da localidade"
                        name={`${namePrefix}.neighborhood`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "neighborhood",
                            event.target.value,
                          )
                        }
                        value={location.neighborhood}
                      />
                      <TextField
                        autoComplete="address-level2"
                        id={`${idPrefix}-city`}
                        label="Cidade da localidade"
                        name={`${namePrefix}.city`}
                        onChange={(event) =>
                          updateAdditionalLocation(
                            location.clientId,
                            "city",
                            event.target.value,
                          )
                        }
                        value={location.city}
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
            errors={resolveFieldErrors("city")}
            id={`${role.toLowerCase()}-city`}
            label="Cidade"
            name="city"
            defaultValue={creatorInitialValues?.city}
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
