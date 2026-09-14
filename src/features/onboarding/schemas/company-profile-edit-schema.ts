import { z } from "zod";

import {
  companyProfileFieldsSchema,
  validateSocialChannels,
} from "./onboarding-form-schema";

export const companyProfileEditSchema = companyProfileFieldsSchema
  .omit({
    coverAssetId: true,
    logoAssetId: true,
  })
  .extend({
    expectedVersion: z.coerce
      .number("A versão do perfil não é válida.")
      .int()
      .positive(),
  })
  .superRefine(validateSocialChannels);

export type CompanyProfileEditInput = z.infer<typeof companyProfileEditSchema>;
