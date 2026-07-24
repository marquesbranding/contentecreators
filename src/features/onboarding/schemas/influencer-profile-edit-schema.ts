import { z } from "zod";

import { influencerProfileFieldsSchema } from "./onboarding-form-schema";

export const influencerProfileEditSchema = influencerProfileFieldsSchema
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
  });

export type InfluencerProfileEditInput = z.infer<
  typeof influencerProfileEditSchema
>;
