import { z } from "zod";

const draftText = (maximum: number) => z.string().trim().max(maximum);
const draftUrl = z.union([
  z.literal(""),
  z.url("Informe uma URL válida.").max(2_000),
]);
const draftState = z
  .string()
  .trim()
  .max(2)
  .transform((value) => value.toUpperCase());
const draftWhatsapp = z.string().trim().max(20);
const socialPlatform = z.enum([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "OTHER",
]);
const companyLocationDraftSchema = z
  .object({
    city: draftText(120),
    complement: draftText(120),
    label: draftText(80),
    neighborhood: draftText(120),
    number: draftText(30),
    postalCode: z
      .string()
      .transform((value) => value.replace(/\D/gu, ""))
      .pipe(z.string().max(8)),
    state: draftState,
    street: draftText(180),
  })
  .partial()
  .strict();

export const creatorOnboardingDraftPayloadSchema = z
  .object({
    bio: draftText(2_000),
    city: draftText(120),
    creatorType: z.enum(["INFLUENCER", "UGC"]),
    displayName: draftText(120),
    engagementRate: z.number().min(0).max(100),
    followers: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    legalName: draftText(160),
    nicheSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)).max(5),
    socialPlatform,
    socialUrl: draftUrl,
    state: draftState,
    whatsapp: draftWhatsapp,
  })
  .partial()
  .strict();

export const companyOnboardingDraftPayloadSchema = z
  .object({
    additionalLocations: z.array(companyLocationDraftSchema).max(9),
    city: draftText(120),
    cnpj: z
      .string()
      .transform((value) => value.replace(/\D/gu, ""))
      .pipe(z.string().max(14)),
    complement: draftText(120),
    description: draftText(3_000),
    employeeRange: z.enum([
      "UP_TO_10",
      "11_TO_50",
      "51_TO_200",
      "201_TO_500",
      "MORE_THAN_500",
    ]),
    legalName: draftText(200),
    neighborhood: draftText(120),
    number: draftText(30),
    postalCode: z
      .string()
      .transform((value) => value.replace(/\D/gu, ""))
      .pipe(z.string().max(8)),
    segment: draftText(120),
    socialPlatform,
    socialUrl: draftUrl,
    state: draftState,
    street: draftText(180),
    tradeName: draftText(160),
    websiteUrl: draftUrl,
    whatsapp: draftWhatsapp,
  })
  .partial()
  .strict();

export const onboardingDraftSaveSchema = z
  .discriminatedUnion("role", [
    z
      .object({
        expectedVersion: z.number().int().min(0),
        payload: creatorOnboardingDraftPayloadSchema,
        role: z.literal("INFLUENCER"),
      })
      .strict(),
    z
      .object({
        expectedVersion: z.number().int().min(0),
        payload: companyOnboardingDraftPayloadSchema,
        role: z.literal("COMPANY"),
      })
      .strict(),
  ])
  .refine((value) => JSON.stringify(value.payload).length <= 50_000, {
    message: "O rascunho excede o tamanho permitido.",
    path: ["payload"],
  });

export type CreatorOnboardingDraftPayload = z.infer<
  typeof creatorOnboardingDraftPayloadSchema
>;
export type CompanyOnboardingDraftPayload = z.infer<
  typeof companyOnboardingDraftPayloadSchema
>;
export type OnboardingDraftSaveInput = z.infer<
  typeof onboardingDraftSaveSchema
>;
