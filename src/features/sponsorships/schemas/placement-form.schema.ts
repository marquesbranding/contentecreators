import {
  sponsorshipColorSchema,
  addCreativeLinkIssues,
} from "./sponsorship-creative-options.schema";
import { SPONSORSHIP_FONT_KEYS } from "../domain/sponsorship-appearance";
import { z } from "zod";
import {
  sponsorshipAudienceSchema,
  sponsorshipPlacementTypeSchema,
  type SponsorshipAdminPlacementDto,
} from "../api/sponsorship-management.contract";
import { getPlacementSlot } from "../domain/placement-slot-catalog";
import { safeSponsorshipLinkSchema } from "./sponsorship-placement.schema";
export const placementFormSchema = z
  .object({
    linkOnCreative: z.boolean(),
    showSponsoredBadge: z.boolean(),
    showAdvertiserLabel: z.boolean(),
    textColor: z.union([z.literal(""), sponsorshipColorSchema]),
    buttonBackgroundColor: z.union([z.literal(""), sponsorshipColorSchema]),
    buttonTextColor: z.union([z.literal(""), sponsorshipColorSchema]),
    fontFamily: z.union([z.literal(""), z.enum(SPONSORSHIP_FONT_KEYS)]),
    imageAlt: z.string().trim().max(200),
    advertiserLabel: z.string().trim().max(160),
    audience: sponsorshipAudienceSchema,
    body: z.string().trim().max(500),
    creativeAssetId: z.string(),
    creativeAssetMobileId: z.string(),
    creativeAssetTabletId: z.string(),
    endsAt: z.string(),
    featuredCreatorProfileId: z.string(),
    linkLabel: z.string().trim().max(80),
    linkUrl: z.union([z.literal(""), safeSponsorshipLinkSchema]),
    placementType: sponsorshipPlacementTypeSchema,
    reason: z
      .string()
      .trim()
      .max(500, "Use até 500 caracteres.")
      .refine(
        (value) => !value || value.length >= 3,
        "Use pelo menos 3 caracteres na nota.",
      ),
    slotKey: z.string().trim().min(1, "Selecione uma posição."),
    startsAt: z.string(),
    title: z.string().trim().max(160),
  })
  .superRefine((values, context) => {
    for (const field of [
      "creativeAssetId",
      "creativeAssetTabletId",
      "creativeAssetMobileId",
    ] as const) {
      if (values[field] && !z.uuid().safeParse(values[field]).success) {
        context.addIssue({
          code: "custom",
          message: "A mídia selecionada é inválida.",
          path: [field],
        });
      }
    }

    if (
      (values.creativeAssetTabletId || values.creativeAssetMobileId) &&
      !values.creativeAssetId
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Envie a imagem desktop antes de enviar as versões tablet ou mobile.",
        path: ["creativeAssetId"],
      });
    }

    if (
      getPlacementSlot(values.slotKey)?.placementType !== values.placementType
    ) {
      context.addIssue({
        code: "custom",
        message: "Selecione uma posição válida para este tipo.",
        path: ["slotKey"],
      });
    }

    addCreativeLinkIssues(values, context);
    if (
      values.startsAt &&
      values.endsAt &&
      new Date(values.endsAt) <= new Date(values.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "O término deve ser posterior ao início.",
        path: ["endsAt"],
      });
    }
  });

export type PlacementFormValues = z.input<typeof placementFormSchema>;

export function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return parts.replace(" ", "T");
}

export function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function toIso(value: string) {
  return value ? new Date(`${value}:00-03:00`).toISOString() : null;
}

export function formDefaults(
  placement?: SponsorshipAdminPlacementDto,
): PlacementFormValues {
  return {
    linkOnCreative: placement?.linkOnCreative ?? false,
    showSponsoredBadge: placement?.showSponsoredBadge ?? true,
    showAdvertiserLabel: placement?.showAdvertiserLabel ?? false,
    textColor: placement?.textColor ?? "",
    buttonBackgroundColor: placement?.buttonBackgroundColor ?? "",
    buttonTextColor: placement?.buttonTextColor ?? "",
    fontFamily: placement?.fontFamily ?? "",
    imageAlt: placement?.imageAlt ?? "",
    advertiserLabel: placement?.advertiserLabel ?? "Contente Creators",
    audience: placement?.audience ?? "ALL",
    body: placement?.body ?? "",
    creativeAssetId: placement?.creativeAssetId ?? "",
    creativeAssetMobileId: placement?.creativeAssetMobileId ?? "",
    creativeAssetTabletId: placement?.creativeAssetTabletId ?? "",
    endsAt: toDateTimeLocal(placement?.endsAt ?? null),
    featuredCreatorProfileId: placement?.featuredCreatorProfileId ?? "",
    linkLabel: placement?.linkLabel ?? "",
    linkUrl: placement?.linkUrl ?? "",
    placementType: placement?.placementType ?? "TOP_BANNER",
    reason: "",
    slotKey: placement?.slotKey ?? "catalog-top",
    startsAt: toDateTimeLocal(placement?.startsAt ?? null),
    title: placement?.title ?? "",
  };
}
