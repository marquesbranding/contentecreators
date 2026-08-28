import { z } from "zod";

import {
  influencerProfileFieldsSchema,
  validateSocialChannels,
} from "./onboarding-form-schema";

export const influencerProfileEditSchema = z
  .object(influencerProfileFieldsSchema.shape)
  .omit({
    avatarAssetId: true,
    contactVisibilityAccepted: true,
    coverAssetId: true,
  })
  .extend({
    expectedVersion: z.coerce
      .number("A versão do perfil não é válida.")
      .int()
      .positive(),
  })
  .superRefine((value, context) => {
    if (value.nicheSlugs.includes("outros") && !value.otherNiche?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Informe qual é o outro nicho.",
        path: ["otherNiche"],
      });
    }
  })
  .superRefine(validateSocialChannels);

export type InfluencerProfileEditInput = z.infer<
  typeof influencerProfileEditSchema
>;
