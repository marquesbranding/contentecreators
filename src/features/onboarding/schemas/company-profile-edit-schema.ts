import { z } from "zod";

import { companyProfileFieldsSchema } from "./onboarding-form-schema";

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
  .superRefine((value, context) => {
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
  });

export type CompanyProfileEditInput = z.infer<typeof companyProfileEditSchema>;
