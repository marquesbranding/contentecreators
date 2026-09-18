import {
  sponsorshipCreativeOptionsShape,
  addCreativeLinkIssues,
} from "./sponsorship-creative-options.schema";
import { z } from "zod";

import {
  PLACEMENT_AUDIENCES,
  PLACEMENT_TYPES,
} from "../types/sponsorship-placement.types";

const emptyToNull = (value: unknown) =>
  value === "" || value === undefined ? null : value;

const nullableText = (maximum: number) =>
  z.preprocess(emptyToNull, z.string().trim().min(1).max(maximum).nullable());

const nullableUuid = z.preprocess(emptyToNull, z.uuid().nullable());
const instantSchema = z.union([
  z.date(),
  z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
]);
const nullableInstant = z.preprocess(emptyToNull, instantSchema.nullable());

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export const safeSponsorshipLinkSchema = z
  .url("Informe um link válido.")
  .max(2_048)
  .refine(isSafeHttpUrl, "Use somente links HTTP(S) seguros.");

const nullableSafeLink = z.preprocess(
  emptyToNull,
  safeSponsorshipLinkSchema.nullable(),
);

const sponsorshipPlacementDraftBaseSchema = z
  .object({
    advertiserAccountId: nullableUuid.default(null),
    ...sponsorshipCreativeOptionsShape,
    advertiserLabel: nullableText(160).default(null),
    audience: z.enum(PLACEMENT_AUDIENCES),
    body: nullableText(500).default(null),
    creativeAssetId: nullableUuid.default(null),
    creativeAssetMobileId: nullableUuid.default(null),
    creativeAssetTabletId: nullableUuid.default(null),
    endsAt: nullableInstant.default(null),
    featuredCreatorProfileId: nullableUuid.default(null),
    isActive: z.boolean().default(false),
    linkLabel: nullableText(80).default(null),
    linkUrl: nullableSafeLink.default(null),
    placementType: z.enum(PLACEMENT_TYPES),
    slotKey: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use uma chave de posição válida."),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
    startsAt: nullableInstant.default(null),
    title: nullableText(160).default(null),
  })
  .strict();

function addScheduleAndLinkIssues(
  value: z.infer<typeof sponsorshipPlacementDraftBaseSchema>,
  context: z.RefinementCtx,
) {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    context.addIssue({
      code: "custom",
      message: "A data final deve ser posterior à data inicial.",
      path: ["endsAt"],
    });
  }

  addCreativeLinkIssues(value, context);
}

export const sponsorshipPlacementDraftSchema =
  sponsorshipPlacementDraftBaseSchema.superRefine(addScheduleAndLinkIssues);

export const sponsorshipPlacementActivationSchema =
  sponsorshipPlacementDraftBaseSchema.superRefine((value, context) => {
    addScheduleAndLinkIssues(value, context);

    if (!value.isActive) {
      context.addIssue({
        code: "custom",
        message: "Marque o posicionamento como ativo.",
        path: ["isActive"],
      });
    }

    if (value.placementType !== "FEATURED_CREATOR" && !value.creativeAssetId) {
      context.addIssue({
        code: "custom",
        message: "Selecione uma mídia privada válida antes de ativar.",
        path: ["creativeAssetId"],
      });
    }

    if (
      value.placementType === "FEATURED_CREATOR" &&
      !value.featuredCreatorProfileId
    ) {
      context.addIssue({
        code: "custom",
        message: "Selecione um criador aprovado antes de ativar.",
        path: ["featuredCreatorProfileId"],
      });
    }
  });

export type SponsorshipPlacementDraftInput = z.input<
  typeof sponsorshipPlacementDraftSchema
>;
export type SponsorshipPlacementDraftOutput = z.output<
  typeof sponsorshipPlacementDraftSchema
>;
