import { z } from "zod";
import {
  HEX_COLOR_PATTERN,
  SPONSORSHIP_FONT_KEYS,
} from "../domain/sponsorship-appearance";

export const sponsorshipColorSchema = z
  .string()
  .regex(
    HEX_COLOR_PATTERN,
    "Use uma cor hexadecimal com 6 dígitos, como #FF5500.",
  );
export const sponsorshipCreativeOptionsShape = {
  linkOnCreative: z.boolean().default(false),
  showSponsoredBadge: z.boolean().default(true),
  showAdvertiserLabel: z.boolean().default(false),
  textColor: sponsorshipColorSchema.nullable().default(null),
  buttonBackgroundColor: sponsorshipColorSchema.nullable().default(null),
  buttonTextColor: sponsorshipColorSchema.nullable().default(null),
  fontFamily: z.enum(SPONSORSHIP_FONT_KEYS).nullable().default(null),
  imageAlt: z.string().trim().max(200).nullable().default(null),
};
export const sponsorshipCreativeOptionsSchema = z.object(
  sponsorshipCreativeOptionsShape,
);

export function addCreativeLinkIssues(
  value: {
    linkUrl: string | null;
    linkLabel: string | null;
    linkOnCreative?: boolean;
    showAdvertiserLabel?: boolean;
    advertiserLabel?: string | null;
  },
  context: z.RefinementCtx,
) {
  if (!value.linkUrl && (value.linkOnCreative || value.linkLabel)) {
    context.addIssue({
      code: "custom",
      path: ["linkUrl"],
      message: value.linkOnCreative
        ? "Informe o endereço para tornar o banner clicável."
        : "Informe o endereço para o botão.",
    });
  }
  if (value.showAdvertiserLabel && !value.advertiserLabel?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["advertiserLabel"],
      message: "Informe o nome da empresa patrocinadora.",
    });
  }
}
