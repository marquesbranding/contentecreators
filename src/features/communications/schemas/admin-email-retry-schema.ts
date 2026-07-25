import { z } from "zod";

export const adminEmailRetrySchema = z.object({
  outboxId: z.uuid({ error: "Mensagem de e-mail inválida." }),
  reason: z
    .string()
    .trim()
    .min(3, "Informe o motivo do reenvio.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
  requestId: z.string().trim().min(8).max(128),
});

export type AdminEmailRetryCommand = z.infer<typeof adminEmailRetrySchema>;
