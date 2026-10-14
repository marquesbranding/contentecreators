import { z } from "zod";

import { isDeletionPhrase } from "../domain/deletion-policy";

export const deleteAccountSchema = z.object({
  acknowledged: z.literal("on", {
    error: "Confirme que entendeu que a exclusão é irreversível.",
  }),
  confirmation: z
    .string()
    .refine(isDeletionPhrase, { error: "Digite EXCLUIR para confirmar." }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
