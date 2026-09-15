"use server";

import "server-only";

import { ZodError } from "zod";

import { consumeIdentityRateLimit } from "@/features/security/server";

import { adminEmailBatchRetrySchema } from "../../schemas/admin-email-retry-schema";
import { createServerAdminEmailRetryService } from "../services/server-admin-email-retry.service";

export interface AdminEmailRetryActionState {
  message?: string;
  status: "error" | "idle" | "success";
}

export interface AdminEmailBatchRetryActionState {
  message?: string;
  status: "error" | "idle" | "success";
}

const resultMessages = {
  already_scheduled: "Este e-mail já está programado para uma nova tentativa.",
  already_sent: "Este e-mail já foi enviado.",
  not_found: "Não foi possível localizar este e-mail.",
  not_retryable: "Este e-mail não está elegível para reenvio manual.",
} as const;

export async function retryFailedEmailAction(
  _previousState: AdminEmailRetryActionState,
  formData: FormData,
): Promise<AdminEmailRetryActionState> {
  try {
    const capacity = await consumeIdentityRateLimit("adminCommand");
    if (!capacity.allowed) {
      return {
        message:
          "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
        status: "error",
      };
    }

    const service = await createServerAdminEmailRetryService();
    const result = await service.retry({
      outboxId: String(formData.get("outboxId") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      requestId: crypto.randomUUID(),
    });

    if (result.kind === "scheduled") {
      return {
        message:
          result.delivery === "attempted"
            ? "Nova tentativa de envio processada."
            : "Nova tentativa programada. O envio continuará em segundo plano.",
        status: "success",
      };
    }

    return {
      message: resultMessages[result.kind],
      status:
        result.kind === "already_scheduled" || result.kind === "already_sent"
          ? "success"
          : "error",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        message: error.issues[0]?.message ?? "Revise os dados do reenvio.",
        status: "error",
      };
    }

    return {
      message:
        "Não foi possível programar o reenvio. Atualize a página e tente novamente.",
      status: "error",
    };
  }
}

export async function retryFailedEmailsBatchAction(
  _previousState: AdminEmailBatchRetryActionState,
  formData: FormData,
): Promise<AdminEmailBatchRetryActionState> {
  try {
    const command = adminEmailBatchRetrySchema.parse({
      outboxIds: formData.getAll("outboxId").map(String),
      reason: String(formData.get("reason") ?? ""),
      requestId: crypto.randomUUID(),
    });

    const service = await createServerAdminEmailRetryService();
    let scheduled = 0;
    let skipped = 0;

    for (const outboxId of command.outboxIds) {
      const capacity = await consumeIdentityRateLimit("adminCommand");
      if (!capacity.allowed) {
        return {
          message:
            scheduled > 0
              ? `${scheduled} de ${command.outboxIds.length} reenvios programados. Muitas ações administrativas foram realizadas; aguarde antes de continuar.`
              : "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
          status: scheduled > 0 ? "success" : "error",
        };
      }

      const result = await service.retry({
        outboxId,
        reason: command.reason,
        requestId: `${command.requestId}:${outboxId}`,
      });

      if (result.kind === "scheduled") {
        scheduled += 1;
      } else {
        skipped += 1;
      }
    }

    if (scheduled === 0) {
      return {
        message:
          "Nenhum reenvio pôde ser programado. Os e-mails selecionados não estão mais elegíveis.",
        status: "error",
      };
    }

    return {
      message:
        skipped === 0
          ? `${scheduled} reenvios programados com o mesmo motivo.`
          : `${scheduled} de ${command.outboxIds.length} reenvios programados. ${skipped} já não estavam elegíveis.`,
      status: "success",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        message: error.issues[0]?.message ?? "Revise os dados do reenvio em lote.",
        status: "error",
      };
    }

    return {
      message:
        "Não foi possível programar os reenvios selecionados. Atualize a página e tente novamente.",
      status: "error",
    };
  }
}
