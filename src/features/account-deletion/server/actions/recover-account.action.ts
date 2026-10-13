"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { consumeIdentityRateLimit } from "@/features/security/server";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { recoverAccountSchema } from "../../schemas/delete-account.schema";
import type { RecoverAccountActionState } from "../../types/account-deletion.types";
import { createServerAccountDeletionService } from "../services/server-account-deletion.service";

export async function recoverAccountAction(
  _previousState: RecoverAccountActionState,
  formData: FormData,
): Promise<RecoverAccountActionState> {
  const parsed = recoverAccountSchema.safeParse({
    accountId: formData.get("accountId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      fieldErrors: {
        accountId: flattened.accountId,
        reason: flattened.reason,
      },
      message: "Revise os campos destacados.",
      status: "error",
    };
  }

  const capacity = await consumeIdentityRateLimit("adminCommand").catch(() => ({
    allowed: true,
  }));

  if (!capacity.allowed) {
    return {
      message: "Muitas ações em pouco tempo. Aguarde e tente novamente.",
      status: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerAccountDeletionService();
    const result = await service.recoverAccount({
      accountId: parsed.data.accountId,
      reason: parsed.data.reason,
      requestId,
    });

    if (result.kind === "not_recoverable") {
      return {
        message:
          "Esta conta não pode mais ser recuperada: a janela de 30 dias terminou ou não há exclusão pendente.",
        status: "error",
      };
    }
  } catch (error) {
    operationalLogger.error({
      errorCategory: error instanceof Error ? error.name : "unknown",
      details: { name: "account_recovery_failed" },
      event: "account_lifecycle",
      operation: "account_recovery",
      outcome: "failed",
      requestId,
    });

    return {
      message: "Não foi possível recuperar a conta agora. Tente novamente.",
      status: "error",
    };
  }

  revalidatePath(`/backoffice/accounts/${parsed.data.accountId}`);

  return {
    message: "Conta recuperada. O usuário foi avisado por e-mail.",
    status: "success",
  };
}
