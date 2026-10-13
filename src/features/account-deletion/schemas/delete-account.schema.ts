import { z } from "zod";

import { isDeletionPhrase } from "../domain/deletion-policy";

export const deleteAccountSchema = z.object({
  acknowledged: z.literal("on", {
    error: "Confirme que entendeu que a exclusão é irreversível.",
  }),
  confirmation: z
    .string()
    .refine(isDeletionPhrase, { error: "Digite EXCLUIR para confirmar." }),
  password: z
    .string()
    .max(200, { error: "A senha é muito longa." })
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const recoverAccountSchema = z.object({
  accountId: z.uuid({ error: "Selecione uma conta válida." }),
  reason: z
    .string()
    .trim()
    .min(3, { error: "Informe o motivo da recuperação." })
    .max(1_000, { error: "O motivo é muito longo." }),
});

export type RecoverAccountInput = z.infer<typeof recoverAccountSchema>;
