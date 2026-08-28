import { z } from "zod";

import { isValidCnpj, normalizeCnpj } from "../domain/cnpj";
import { OTHER_NICHE_SLUG } from "../domain/profile-segments";
import { SOCIAL_CHANNEL_PLATFORMS } from "../domain/social-channels-form-data";

const requiredMessage = "Preencha este campo.";
const acceptedConsent = z
  .literal("on", {
    error: "Você precisa aceitar para continuar.",
  })
  .transform(() => true);
const optionalConsent = z
  .union([
    z.literal("on"),
    z.literal(true),
    z.literal(false),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => value === "on" || value === true)
  .default(false);
const brazilianState = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/u, "Informe uma UF válida."));
const city = z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(120);
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido.").max(320));
const legalName = z
  .string()
  .trim()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(200);
const whatsapp = z
  .string()
  .trim()
  .min(10, "Informe um WhatsApp com DDD.")
  .max(20);
const optionalNonNegativeInt = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.coerce
    .number("Informe uma quantidade válida.")
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
);
const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[a-z]/u, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/u, "Inclua uma letra maiúscula.")
  .regex(/[0-9]/u, "Inclua um número.");
const url = z
  .string()
  .trim()
  .pipe(
    z
      .url("Informe uma URL válida.")
      .max(2_000)
      .refine((value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      }, "Use uma URL iniciada por http:// ou https://."),
  )
  .transform((value) => {
    const normalized = new URL(value);
    normalized.hash = "";

    if (normalized.pathname !== "/") {
      normalized.pathname = normalized.pathname.replace(/\/+$/u, "");
    }

    return normalized.toString();
  });
const optionalUrl = z
  .preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.union([z.literal(""), url]),
  )
  .transform((value) => value || undefined);
const socialPlatform = z.enum([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "THREADS",
  "TELEGRAM",
  "OTHER",
]);
const optionalSocialPlatform = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  socialPlatform.optional(),
);
const isPrimaryFlag = z.preprocess(
  (value) => value === "on" || value === true,
  z.boolean(),
);
const creatorSocialChannelPlatform = z.enum(SOCIAL_CHANNEL_PLATFORMS);
const socialChannelEntry = z.object({
  followerCount: z.coerce
    .number("Informe uma quantidade válida.")
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER),
  interactions: optionalNonNegativeInt,
  isPrimary: isPrimaryFlag,
  newFollowers: optionalNonNegativeInt,
  platform: creatorSocialChannelPlatform,
  sharedContent: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(200).optional(),
  ),
  url,
  views: optionalNonNegativeInt,
});

export function validateSocialChannels(
  value: {
    role?: "COMPANY" | "INFLUENCER";
    socialChannels?: z.infer<typeof socialChannelEntry>[];
  },
  context: z.RefinementCtx,
) {
  const channels = value.socialChannels;

  if (!channels || channels.length === 0) {
    return;
  }

  const primaryCount = channels.filter((channel) => channel.isPrimary).length;

  if (primaryCount !== 1) {
    context.addIssue({
      code: "custom",
      message: "Marque exatamente uma rede social como principal.",
      path: ["socialChannels"],
    });
  }

  channels.forEach((channel, index) => {
    if (channel.platform === "INSTAGRAM") {
      return;
    }

    const hasInstagramOnlyFields =
      channel.views !== undefined ||
      channel.interactions !== undefined ||
      channel.newFollowers !== undefined ||
      channel.sharedContent !== undefined;

    if (hasInstagramOnlyFields) {
      context.addIssue({
        code: "custom",
        message:
          "Visualizações, interações, novos seguidores e conteúdo compartilhado só podem ser informados no Instagram.",
        path: ["socialChannels", index],
      });
    }
  });
}

const consentShape = {
  privacyAccepted: acceptedConsent,
  termsAccepted: acceptedConsent,
};
const companyLocationSchema = z.object({
  city,
  complement: z.string().trim().max(120).optional().default(""),
  label: z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(80),
  neighborhood: z
    .string()
    .trim()
    .min(2, "Use pelo menos 2 caracteres.")
    .max(120),
  number: z.string().trim().min(1, requiredMessage).max(30),
  postalCode: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/gu, ""))
    .pipe(z.string().length(8, "Informe um CEP válido.")),
  state: brazilianState,
  street: z.string().trim().min(3, "Use pelo menos 3 caracteres.").max(180),
});

function validateOtherNiche(
  value: {
    nicheSlugs?: string[];
    otherNiche?: string;
    role?: "COMPANY" | "INFLUENCER";
  },
  context: z.RefinementCtx,
) {
  if (value.role === "COMPANY") {
    return;
  }

  if (
    value.nicheSlugs?.includes(OTHER_NICHE_SLUG) &&
    !value.otherNiche?.trim()
  ) {
    context.addIssue({
      code: "custom",
      message: "Informe qual é o outro nicho.",
      path: ["otherNiche"],
    });
  }
}

export const influencerProfileFieldsSchema = z
  .object({
    avatarAssetId: z.uuid("A foto de perfil enviada não é válida.").optional(),
    bio: z.string().trim().min(30, "Use pelo menos 30 caracteres.").max(2_000),
    city,
    contactVisibilityAccepted: optionalConsent,
    coverAssetId: z.uuid("A capa enviada não é válida.").optional(),
    creatorType: z.enum(["INFLUENCER", "UGC"], {
      error: "Escolha um tipo de creator.",
    }),
    displayName: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      z
        .string()
        .trim()
        .min(2, "Use pelo menos 2 caracteres.")
        .max(120)
        .optional(),
    ),
    legalName,
    nicheSlugs: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u))
      .min(1, "Escolha pelo menos um nicho.")
      .max(5, "Escolha no máximo cinco nichos."),
    otherNiche: z.preprocess(
      (value) => (value === null || value === "" ? undefined : value),
      z
        .string()
        .trim()
        .min(2, "Informe qual é o outro nicho.")
        .max(120)
        .regex(/[\p{L}\p{N}]/u, "Use letras ou números para descrever o nicho.")
        .optional(),
    ),
    socialChannels: z
      .array(socialChannelEntry)
      .min(1, "Selecione pelo menos uma rede social e informe o link."),
    state: brazilianState,
    whatsapp,
  })
  .superRefine(validateOtherNiche)
  .superRefine(validateSocialChannels);

const creatorProfileShape = {
  ...consentShape,
  ...influencerProfileFieldsSchema.shape,
};

export const companyProfileFieldsSchema = z.object({
  additionalLocations: z
    .array(companyLocationSchema)
    .max(9, "Cadastre no máximo nove localidades adicionais.")
    .default([]),
  city,
  cnpj: z
    .string()
    .trim()
    .transform(normalizeCnpj)
    .pipe(
      z
        .string()
        .length(14, "Informe os 14 dígitos do CNPJ.")
        .refine(isValidCnpj, "CNPJ inválido. Confira os números informados."),
    ),
  coverAssetId: z.uuid("A capa enviada não é válida.").optional(),
  complement: z.string().trim().max(120).optional().default(""),
  description: z
    .string()
    .trim()
    .min(30, "Use pelo menos 30 caracteres.")
    .max(3_000),
  employeeRange: z.enum(
    ["UP_TO_10", "11_TO_50", "51_TO_200", "201_TO_500", "MORE_THAN_500"],
    { error: "Escolha o tamanho da empresa." },
  ),
  legalName,
  logoAssetId: z.uuid("O logo enviado não é válido.").optional(),
  neighborhood: z
    .string()
    .trim()
    .min(2, "Use pelo menos 2 caracteres.")
    .max(120),
  number: z.string().trim().min(1, requiredMessage).max(30),
  postalCode: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/gu, ""))
    .pipe(z.string().length(8, "Informe um CEP válido.")),
  segment: z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(120),
  socialPlatform: optionalSocialPlatform,
  socialUrl: optionalUrl.optional(),
  state: brazilianState,
  street: z.string().trim().min(3, "Use pelo menos 3 caracteres.").max(180),
  tradeName: z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(160),
  websiteUrl: optionalUrl.optional(),
  whatsapp,
});

const companyProfileShape = {
  ...consentShape,
  ...companyProfileFieldsSchema.shape,
};

function validateMatchingPasswords(
  value: { password: string; passwordConfirmation: string },
  context: z.RefinementCtx,
) {
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({
      code: "custom",
      message: "As senhas precisam ser iguais.",
      path: ["passwordConfirmation"],
    });
  }
}

const creatorEmailRegistrationSchema = z
  .object({
    ...creatorProfileShape,
    email,
    password,
    passwordConfirmation: z.string(),
    role: z.literal("INFLUENCER"),
  })
  .superRefine(validateOtherNiche)
  .superRefine(validateMatchingPasswords);

const companyEmailRegistrationSchema = z
  .object({
    ...companyProfileShape,
    email,
    password,
    passwordConfirmation: z.string(),
    role: z.literal("COMPANY"),
  })
  .superRefine(validateMatchingPasswords);

function validateCompanySocialPair(
  value: {
    role: "COMPANY" | "INFLUENCER";
    socialPlatform?: string;
    socialUrl?: string;
  },
  context: z.RefinementCtx,
) {
  if (value.role !== "COMPANY") {
    return;
  }

  if (value.socialPlatform && !value.socialUrl) {
    context.addIssue({
      code: "custom",
      message: "Informe o link da rede social selecionada.",
      path: ["socialUrl"],
    });
  }

  if (!value.socialPlatform && value.socialUrl) {
    context.addIssue({
      code: "custom",
      message: "Selecione a rede social deste link.",
      path: ["socialPlatform"],
    });
  }
}

export const emailRegistrationSchema = z
  .union([creatorEmailRegistrationSchema, companyEmailRegistrationSchema])
  .superRefine(validateCompanySocialPair)
  .superRefine(validateSocialChannels);

export const googleProfileSchema = z
  .discriminatedUnion("role", [
    z.object({
      ...creatorProfileShape,
      role: z.literal("INFLUENCER"),
    }),
    z.object({
      ...companyProfileShape,
      role: z.literal("COMPANY"),
    }),
  ])
  .superRefine(validateCompanySocialPair)
  .superRefine(validateOtherNiche)
  .superRefine(validateSocialChannels);

export type EmailRegistrationInput = z.infer<typeof emailRegistrationSchema>;
export type GoogleProfileInput = z.infer<typeof googleProfileSchema>;
