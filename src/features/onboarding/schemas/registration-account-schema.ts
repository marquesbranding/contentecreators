import { z } from "zod";
import { resetPasswordSchema } from "@/features/identity";

export const registrationAccountSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe pelo menos 3 caracteres.")
    .max(160),
  accountType: z.enum(["INFLUENCER", "UGC", "COMPANY"], {
    error: "Selecione o tipo de cadastro.",
  }),
  whatsapp: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,11}$/, "Informe o WhatsApp com DDD.")),
});
export function parseRegistrationAccount(
  value: unknown,
  requiresPassword: boolean,
) {
  return requiresPassword
    ? registrationAccountSchema.and(resetPasswordSchema).safeParse(value)
    : registrationAccountSchema.safeParse(value);
}
