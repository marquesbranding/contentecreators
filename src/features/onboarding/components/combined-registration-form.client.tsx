"use client";

import { Building2, CircleAlert, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { GoogleAuthOption, PasswordField } from "@/features/identity/client";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import {
  ProfileHeaderPreview,
  type ProfileHeaderPreviewBadge,
} from "@/shared/components/profile-header-preview";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { useSubmitConfirmation } from "@/shared/hooks/use-submit-confirmation";
import { useUnsavedChangesGuard } from "@/shared/hooks/use-unsaved-changes-guard";
import { cn } from "@/shared/lib/cn";
import { dispatchFormActionPreservingValues } from "@/shared/lib/forms/dispatch-form-action-preserving-values";

import { creatorNicheOptions } from "@/shared/domain/profile-segments";
import type { OnboardingAction } from "../types/onboarding-action.types";
import { initialOnboardingActionState } from "../types/onboarding-action.types";
import { FormErrorSummary, mergeFieldErrors } from "./form-error-summary";
import { OnboardingSubmitConfirmation } from "./onboarding-submit-confirmation";
import { ProfileFormFields } from "./profile-form-fields.client";
import { RegistrationStepper } from "./registration-stepper.client";

const accountTypeOptions = [
  {
    description:
      "Influenciador é uma pessoa com muitos seguidores que compartilha opiniões e conteúdos capazes de impactar decisões, comportamentos e compras de seus seguidores.",
    icon: UserRound,
    label: "Sou influencer",
    value: "INFLUENCER",
  },
  {
    description:
      "UGC é conteúdo criado por pessoas comuns, geralmente com poucos seguidores, que compartilham experiências reais com uma marca ou produto.",
    icon: Sparkles,
    label: "Sou UGC",
    value: "UGC",
  },
  {
    description:
      "Marcas que querem buscar e contratar UGCs ou influenciadores para divulgar seus produtos ou serviços, buscando alcançar, engajar e influenciar a compra do seu público-alvo.",
    icon: Building2,
    label: "Sou empresa",
    value: "COMPANY",
  },
] as const;

type AccountType = (typeof accountTypeOptions)[number]["value"];

const TOTAL_STEPS = 4;

function initialsFromName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function CombinedRegistrationForm({
  action,
  googleAction,
  initialRole,
  resendAction,
}: {
  action: OnboardingAction;
  googleAction: (formData: FormData) => Promise<void>;
  initialRole?: "INFLUENCER" | "COMPANY";
  resendAction: OnboardingAction;
}) {
  const [accountType, setAccountType] = useState<AccountType | null>(
    initialRole ?? null,
  );
  const role: "INFLUENCER" | "COMPANY" | null =
    accountType === null
      ? null
      : accountType === "COMPANY"
        ? "COMPANY"
        : "INFLUENCER";
  const creatorType: "INFLUENCER" | "UGC" | undefined =
    accountType === "COMPANY" || accountType === null ? undefined : accountType;
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [nameValue, setNameValue] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);
  const [preview, setPreview] = useState({
    location: "",
    nicheLabels: [] as string[],
    segment: "",
  });
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const [resendState, resendFormAction, resendPending] = useActionState(
    resendAction,
    initialOnboardingActionState,
  );
  const {
    clearFieldError,
    clientFieldErrors,
    formRef,
    formValidationProps,
    getFieldErrors,
    isFormValid,
  } = useRequiredFieldValidation();
  const submitConfirmation = useSubmitConfirmation();
  useActionSuccessToast(state, {
    successStatuses: ["success", "confirmation_required"],
    title:
      state.status === "confirmation_required"
        ? "Cadastro salvo"
        : "Cadastro concluído",
  });
  useActionSuccessToast(resendState, {
    title: "Confirmação reenviada",
  });
  useUnsavedChangesGuard(
    hasUnsavedChanges && !pending && state.status !== "confirmation_required",
  );
  const summaryErrors = mergeFieldErrors(clientFieldErrors, state.fieldErrors);
  const roleErrors = getFieldErrors("role", state.fieldErrors?.role);
  const emailErrors = getFieldErrors("email", state.fieldErrors?.email);
  const passwordErrors = getFieldErrors(
    "password",
    state.fieldErrors?.password,
  );
  const passwordConfirmationErrors = getFieldErrors(
    "passwordConfirmation",
    state.fieldErrors?.passwordConfirmation,
  );
  const accountAlreadyExists = state.errorCode === "account_already_exists";
  const whatsappErrors = getFieldErrors(
    "whatsapp",
    state.fieldErrors?.whatsapp,
  );

  function readPreviewFromForm() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const data = new FormData(form);
    const nicheLabels = data
      .getAll("nicheSlugs")
      .map((value) => String(value))
      .map(
        (slug) =>
          creatorNicheOptions.find(
            ([optionSlug]) => optionSlug === slug,
          )?.[1] ?? slug,
      )
      .slice(0, 3);
    const city = String(data.get("city") ?? "").trim();
    const stateAbbreviation = String(data.get("state") ?? "").trim();

    setPreview({
      location:
        city && stateAbbreviation
          ? `${city}, ${stateAbbreviation.toUpperCase()}`
          : city,
      nicheLabels,
      segment: String(data.get("segment") ?? "").trim(),
    });
  }

  function handleAvatarFileChange(file: File | null) {
    setAvatarPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleCoverFileChange(file: File | null) {
    setCoverPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  const goNext = () =>
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  const goBack = () => setCurrentStep((step) => Math.max(1, step - 1));

  const stepLabels =
    role === "COMPANY"
      ? ["Dados de acesso", "Empresa", "Redes sociais", "Localização e termos"]
      : ["Dados de acesso", "Perfil", "Redes sociais", "Localização e termos"];

  const headerBadges: ProfileHeaderPreviewBadge[] =
    role === null
      ? [{ label: "Escolha um tipo de cadastro", tone: "neutral" }]
      : role === "COMPANY"
        ? [
            { label: "Empresa", tone: "primary" },
            ...(preview.segment
              ? [{ label: preview.segment, tone: "neutral" as const }]
              : []),
          ]
        : [
            {
              label:
                accountType === "INFLUENCER" ? "Influenciador" : "Creator UGC",
              tone: "primary",
            },
            ...preview.nicheLabels.map((label) => ({
              label,
              tone: "neutral" as const,
            })),
          ];

  if (state.status === "confirmation_required" && state.values?.email) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Confirme seu e-mail</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-sm leading-6">
          Enviamos o link para{" "}
          <strong className="text-foreground">{state.values.email}</strong>.
          Depois da confirmação, seu cadastro será enviado para análise
          automaticamente.
        </p>
        <form action={resendFormAction} className="space-y-3">
          <input name="email" type="hidden" value={state.values.email} />
          <input
            name="role"
            type="hidden"
            value={state.values.role ?? "INFLUENCER"}
          />
          {resendState.message ? (
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {resendState.message}
            </p>
          ) : null}
          <ActionSubmitButton
            className="w-full"
            pending={resendPending}
            pendingLabel="Reenviando confirmação..."
            size="lg"
            variant="outline"
          >
            Reenviar confirmação
          </ActionSubmitButton>
        </form>
        <Link className={buttonVariants({ variant: "link" })} href="/login">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {state.message ? (
        <Alert aria-live="polite" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>
            {accountAlreadyExists
              ? "Conta já cadastrada"
              : "Revise seu cadastro"}
          </AlertTitle>
          <AlertDescription>
            <span className="block">{state.message}</span>
            {accountAlreadyExists ? (
              <span className="mt-4 flex flex-wrap gap-2">
                <Link className={buttonVariants({ size: "sm" })} href="/login">
                  Entrar
                </Link>
                <Link
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href="/forgot-password"
                >
                  Recuperar senha
                </Link>
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <ProfileHeaderPreview
        avatarUrl={avatarPreviewUrl}
        badges={headerBadges}
        coverUrl={coverPreviewUrl}
        displayName={
          nameValue ||
          (role === "COMPANY"
            ? "Nome fantasia da empresa"
            : "Seu nome completo")
        }
        initials={initialsFromName(nameValue)}
        location={preview.location}
        onAvatarClick={
          role === null ? undefined : () => avatarInputRef.current?.click()
        }
        onCoverClick={() => coverInputRef.current?.click()}
      />
      <p className="text-muted-foreground -mt-4 text-center text-xs">
        Toque ou clique na capa e na foto de perfil para adicioná-las.
      </p>

      <form
        action={formAction}
        className="space-y-9"
        noValidate
        onBlur={formValidationProps.onBlur}
        onInput={(event) => {
          setHasUnsavedChanges(true);
          readPreviewFromForm();
          formValidationProps.onInput(event);
        }}
        onSubmit={(event) => {
          if (currentStep < TOTAL_STEPS) {
            event.preventDefault();
            goNext();
            return;
          }

          submitConfirmation.handleSubmit(event, formValidationProps.onSubmit);
          dispatchFormActionPreservingValues(event, formAction);
        }}
        ref={formRef}
      >
        <Input
          accept="image/jpeg,image/png,image/webp"
          aria-label={role === "COMPANY" ? "Logo da empresa" : "Foto de perfil"}
          className="sr-only"
          name={role === "COMPANY" ? "logoFile" : "avatarFile"}
          onChange={(event) =>
            handleAvatarFileChange(event.target.files?.[0] ?? null)
          }
          ref={avatarInputRef}
          tabIndex={-1}
          type="file"
        />
        <Input
          accept="image/jpeg,image/png,image/webp"
          aria-label="Imagem de capa"
          className="sr-only"
          name="coverFile"
          onChange={(event) =>
            handleCoverFileChange(event.target.files?.[0] ?? null)
          }
          ref={coverInputRef}
          tabIndex={-1}
          type="file"
        />

        <RequiredFieldsNotice />
        <FormErrorSummary errors={summaryErrors} />

        <FieldGroup className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="registration-display-name" required>
              {role === "COMPANY" ? "Nome fantasia" : "Nome completo"}
            </FieldLabel>
            <FieldDescription>
              Aparece no cabeçalho do seu perfil, acima.
            </FieldDescription>
            <Input
              className="rounded-xl"
              data-validation-message={
                role === "COMPANY"
                  ? "Use pelo menos 2 caracteres."
                  : "Use pelo menos 3 caracteres."
              }
              disabled={role === null}
              id="registration-display-name"
              maxLength={role === "COMPANY" ? 160 : 200}
              minLength={role === "COMPANY" ? 2 : 3}
              name={role === "COMPANY" ? "tradeName" : "legalName"}
              onChange={(event) => setNameValue(event.target.value)}
              placeholder={
                role === "COMPANY"
                  ? "Nome conhecido pelo público"
                  : "Seu nome completo"
              }
              required
              value={nameValue}
            />
          </Field>
          <Field data-invalid={Boolean(emailErrors?.length)}>
            <FieldLabel htmlFor="registration-email" required>
              E-mail
            </FieldLabel>
            <FieldDescription id="registration-email-description">
              Você usará este e-mail para entrar e acompanhar sua análise.
            </FieldDescription>
            <Input
              aria-describedby={
                [
                  "registration-email-description",
                  emailErrors?.length ? "registration-email-error" : undefined,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              aria-invalid={Boolean(emailErrors?.length)}
              autoComplete="email"
              className="rounded-xl"
              id="registration-email"
              inputMode="email"
              maxLength={320}
              name="email"
              placeholder="voce@exemplo.com"
              required
              type="email"
            />
            <FieldError id="registration-email-error">
              {emailErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>
        </FieldGroup>

        <RegistrationStepper
          currentStep={currentStep}
          steps={stepLabels.map((label) => ({ label }))}
        />

        <div hidden={currentStep !== 1}>
          <FieldSet>
            <FieldLegend id="registration-role-label" required>
              Como você vai usar a plataforma?
            </FieldLegend>
            <FieldDescription>
              Essa escolha define os dados do cadastro e não poderá ser alterada
              por você depois do envio.
            </FieldDescription>
            <Field data-invalid={Boolean(roleErrors?.length)}>
              <RadioGroup
                aria-describedby={
                  roleErrors?.length ? "registration-role-error" : undefined
                }
                aria-invalid={Boolean(roleErrors?.length)}
                aria-labelledby="registration-role-label"
                aria-required="true"
                className="grid gap-4 md:grid-cols-3"
                data-field-kind="radio-group"
                data-field-name="accountType"
                data-required-field="true"
                data-required-message="Escolha como você vai usar a plataforma."
                name="accountType"
                onValueChange={(value) => {
                  if (
                    value === "INFLUENCER" ||
                    value === "UGC" ||
                    value === "COMPANY"
                  ) {
                    setAccountType(value);
                    clearFieldError("role");
                  }
                }}
                value={accountType}
              >
                {accountTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = accountType === option.value;

                  return (
                    <label
                      className={cn(
                        "focus-within:ring-ring/40 flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors focus-within:ring-3",
                        selected
                          ? "border-brand-blue bg-brand-blue-soft"
                          : "border-border hover:border-brand-blue/40",
                      )}
                      htmlFor={`registration-${option.value.toLowerCase()}`}
                      key={option.value}
                      onClick={() => setAccountType(option.value)}
                    >
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl",
                          selected
                            ? "bg-brand-blue text-white"
                            : "bg-muted text-foreground",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong
                          className="block"
                          id={`registration-${option.value.toLowerCase()}-title`}
                        >
                          {option.label}
                        </strong>
                        <span
                          className="text-muted-foreground mt-1 block text-sm leading-5"
                          id={`registration-${option.value.toLowerCase()}-description`}
                        >
                          {option.description}
                        </span>
                      </span>
                      <RadioGroupItem
                        aria-describedby={`registration-${option.value.toLowerCase()}-description`}
                        aria-labelledby={`registration-${option.value.toLowerCase()}-title`}
                        id={`registration-${option.value.toLowerCase()}`}
                        value={option.value}
                      />
                    </label>
                  );
                })}
              </RadioGroup>
              <FieldError id="registration-role-error">
                {roleErrors?.map((message) => (
                  <span className="block" key={message}>
                    {message}
                  </span>
                ))}
              </FieldError>
            </Field>
          </FieldSet>

          <input name="role" type="hidden" value={role ?? ""} />

          <FieldSet>
            <FieldLegend>Senha e contato</FieldLegend>
            <FieldDescription>
              Você usará o e-mail informado acima e esta senha para entrar.
            </FieldDescription>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <PasswordField
                autoComplete="new-password"
                description="Use 8 caracteres, maiúscula, minúscula e número."
                error={passwordErrors}
                id="registration-password"
                label="Senha"
                name="password"
              />
              <PasswordField
                autoComplete="new-password"
                error={passwordConfirmationErrors}
                id="registration-password-confirmation"
                label="Confirmar senha"
                matchFieldName="password"
                matchMessage="As senhas precisam ser iguais."
                name="passwordConfirmation"
              />
              <Field
                className="md:col-span-2"
                data-invalid={Boolean(whatsappErrors?.length)}
              >
                <FieldLabel htmlFor="registration-whatsapp" required>
                  WhatsApp com DDD
                </FieldLabel>
                <FieldDescription id="registration-whatsapp-description">
                  Mínimo de 10 caracteres, incluindo o DDD.
                </FieldDescription>
                <Input
                  aria-describedby={
                    [
                      "registration-whatsapp-description",
                      whatsappErrors?.length
                        ? "registration-whatsapp-error"
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  aria-invalid={Boolean(whatsappErrors?.length)}
                  autoComplete="tel"
                  className="rounded-xl"
                  data-validation-message="Informe um WhatsApp com DDD."
                  id="registration-whatsapp"
                  inputMode="tel"
                  maxLength={20}
                  minLength={10}
                  name="whatsapp"
                  placeholder="(11) 99999-9999"
                  required
                  type="tel"
                />
                <FieldError id="registration-whatsapp-error">
                  {whatsappErrors?.map((message) => (
                    <span className="block" key={message}>
                      {message}
                    </span>
                  ))}
                </FieldError>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        {role ? (
          <div hidden={currentStep === 1}>
            <ProfileFormFields
              creatorType={creatorType}
              hideDisplayNameField
              currentStep={
                currentStep === 3
                  ? "audience"
                  : currentStep === 4
                    ? "location"
                    : "profile"
              }
              fieldErrors={state.fieldErrors}
              getFieldErrors={getFieldErrors}
              key={role}
              onFieldChange={clearFieldError}
              role={role}
              showWhatsappField={false}
            />
          </div>
        ) : currentStep > 1 ? (
          <Alert>
            <AlertTitle>Escolha seu tipo de cadastro</AlertTitle>
            <AlertDescription>
              Volte para a primeira etapa e selecione creator ou empresa para
              ver os campos desta etapa.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            className="flex-1"
            disabled={currentStep === 1}
            onClick={goBack}
            size="lg"
            type="button"
            variant="outline"
          >
            Voltar
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button className="flex-1" onClick={goNext} size="lg" type="button">
              Avançar
            </Button>
          ) : (
            <ActionSubmitButton
              className="flex-1"
              disabled={!isFormValid}
              pending={pending}
              pendingLabel="Criando cadastro..."
              size="lg"
            >
              Criar conta e enviar perfil
            </ActionSubmitButton>
          )}
        </div>
        {currentStep === TOTAL_STEPS && !isFormValid && !pending ? (
          <p
            aria-live="polite"
            className="text-muted-foreground text-center text-sm"
          >
            Preencha corretamente todos os campos obrigatórios para liberar o
            envio.
          </p>
        ) : null}
      </form>
      <OnboardingSubmitConfirmation
        onConfirm={submitConfirmation.confirmSubmission}
        onOpenChange={submitConfirmation.setOpen}
        open={submitConfirmation.open}
      />

      <GoogleAuthOption action={googleAction} />

      <p className="text-muted-foreground text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          className="text-brand-blue font-semibold hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
