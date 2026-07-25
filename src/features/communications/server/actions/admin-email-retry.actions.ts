"use server";

import "server-only";

import { ZodError } from "zod";

import { createServerAdminEmailRetryService } from "../services/server-admin-email-retry.service";

export interface AdminEmailRetryActionState {
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
