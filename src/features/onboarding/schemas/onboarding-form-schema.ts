import { z } from "zod";

import { isValidCnpj, normalizeCnpj } from "../domain/cnpj";

const requiredMessage = "Preencha este campo.";
const acceptedConsent = z
  .literal("on", {
    error: "Você precisa aceitar para continuar.",
  })
  .transform(() => true);
const brazilianState = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/u, "Informe uma UF válida."));
const city = z.string().trim().min(2, requiredMessage).max(120);
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido.").max(320));
const legalName = z.string().trim().min(3, requiredMessage).max(200);
const whatsapp = z
  .string()
  .trim()
  .min(10, "Informe um WhatsApp com DDD.")
  .max(20);
const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[a-z]/u, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/u, "Inclua uma letra maiúscula.")
  .regex(/[0-9]/u, "Inclua um número.");
const url = z.string().trim().pipe(z.url("Informe uma URL válida.").max(2_000));
const optionalUrl = z
  .union([z.literal(""), url])
  .transform((value) => value || undefined);

const consentShape = {
  privacyAccepted: acceptedConsent,
  termsAccepted: acceptedConsent,
};

const creatorProfileShape = {
  ...consentShape,
  bio: z
    .string()
    .trim()
    .min(30, "Conte um pouco mais sobre seu trabalho.")
    .max(2_000),
  city,
  creatorType: z.enum(["INFLUENCER", "UGC"], {
    error: "Escolha um tipo de creator.",
  }),
  displayName: z.string().trim().min(2, requiredMessage).max(120),
  engagementRate: z.coerce.number("Informe uma taxa válida.").min(0).max(100),
  followers: z.coerce
    .number("Informe uma quantidade válida.")
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER),
  legalName,
  nicheSlugs: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u))
    .min(1, "Escolha pelo menos um nicho.")
    .max(5, "Escolha no máximo cinco nichos."),
  socialPlatform: z.enum([
    "INSTAGRAM",
    "TIKTOK",
    "YOUTUBE",
    "FACEBOOK",
    "X",
    "LINKEDIN",
    "OTHER",
  ]),
  socialUrl: url,
  state: brazilianState,
  whatsapp,
};

const companyProfileShape = {
  ...consentShape,
  city,
  cnpj: z
    .string()
    .trim()
    .transform(normalizeCnpj)
    .refine(isValidCnpj, "Informe um CNPJ válido."),
  complement: z.string().trim().max(120).optional().default(""),
  description: z
    .string()
    .trim()
    .min(30, "Conte um pouco mais sobre a empresa.")
    .max(3_000),
  employeeRange: z.enum(
    ["UP_TO_10", "11_TO_50", "51_TO_200", "201_TO_500", "MORE_THAN_500"],
    { error: "Escolha o tamanho da empresa." },
  ),
  legalName,
  neighborhood: z.string().trim().min(2, requiredMessage).max(120),
  number: z.string().trim().min(1, requiredMessage).max(30),
  postalCode: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/gu, ""))
    .pipe(z.string().length(8, "Informe um CEP válido.")),
  segment: z.string().trim().min(2, requiredMessage).max(120),
  state: brazilianState,
  street: z.string().trim().min(3, requiredMessage).max(180),
  tradeName: z.string().trim().min(2, requiredMessage).max(160),
  websiteUrl: optionalUrl,
  whatsapp,
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

export const emailRegistrationSchema = z.union([
  creatorEmailRegistrationSchema,
  companyEmailRegistrationSchema,
]);

export const googleProfileSchema = z.discriminatedUnion("role", [
  z.object({
    ...creatorProfileShape,
    role: z.literal("INFLUENCER"),
  }),
  z.object({
    ...companyProfileShape,
    role: z.literal("COMPANY"),
  }),
]);

export type EmailRegistrationInput = z.infer<typeof emailRegistrationSchema>;
export type GoogleProfileInput = z.infer<typeof googleProfileSchema>;
