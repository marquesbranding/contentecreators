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

export const adminEmailBatchRetrySchema = z.object({
  outboxIds: z
    .array(z.uuid({ error: "Mensagem de e-mail inválida." }))
    .min(1, "Selecione ao menos um e-mail para reenviar.")
    .max(20, "Selecione no máximo 20 e-mails por lote."),
  reason: z
    .string()
    .trim()
    .min(3, "Informe o motivo do reenvio.")
    .max(500, "O motivo deve ter no máximo 500 caracteres."),
  requestId: z.string().trim().min(8).max(128),
});

export type AdminEmailBatchRetryCommand = z.infer<
  typeof adminEmailBatchRetrySchema
>;
