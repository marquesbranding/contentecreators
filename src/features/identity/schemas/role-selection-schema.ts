import { z } from "zod";

export const roleSelectionSchema = z.object({
  role: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toUpperCase() : undefined,
    z.enum(["INFLUENCER", "COMPANY"], {
      error: "Escolha como você vai usar a plataforma.",
    }),
  ),
});

export type RoleSelectionInput = z.infer<typeof roleSelectionSchema>;
