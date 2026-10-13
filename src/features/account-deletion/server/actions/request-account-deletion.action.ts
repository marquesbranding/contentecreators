"use server";

import "server-only";

import { redirect } from "next/navigation";

import { consumeIdentityRateLimit } from "@/features/security/server";
import { logUserFacingError } from "@/shared/server/errors/log-user-facing-error";
import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";

import { deleteAccountSchema } from "../../schemas/delete-account.schema";
import type { AccountDeletionActionState } from "../../types/account-deletion.types";
import { createServerAccountDeletionService } from "../services/server-account-deletion.service";

export async function requestAccountDeletionAction(
  _previousState: AccountDeletionActionState,
  formData: FormData,
): Promise<AccountDeletionActionState> {
  const parsed = deleteAccountSchema.safeParse({
    acknowledged: formData.get("acknowledged") ?? undefined,
    confirmation: String(formData.get("confirmation") ?? ""),
    password: formData.get("password") ?? undefined,
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      code: "VALIDATION_ERROR",
      fieldErrors: {
        acknowledged: flattened.acknowledged,
        confirmation: flattened.confirmation,
        password: flattened.password,
      },
      message: "Revise os campos destacados.",
      status: "error",
    };
  }

  const capacity = await consumeIdentityRateLimit("passwordRecovery").catch(
    () => ({ allowed: true }),
  );

  if (!capacity.allowed) {
    return {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      status: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerAccountDeletionService();
    const result = await service.requestDeletion({
      password: parsed.data.password,
      requestId,
    });

    if (result.kind === "invalid_password") {
      return {
        code: "INVALID_PASSWORD",
        fieldErrors: { password: ["Senha incorreta."] },
        message: "Confirme sua senha para excluir a conta.",
        status: "error",
      };
    }

    if (result.kind === "reauthentication_required") {
      return {
        code: "REAUTH_REQUIRED",
        message:
          "Por segurança, saia e entre novamente com o Google e tente excluir em até 5 minutos.",
        status: "error",
      };
    }

    if (result.kind === "not_available") {
      return {
        code: "NOT_AVAILABLE",
        message:
          "A exclusão não está disponível para esta conta. Fale com contato@marquesbranding.com.",
        status: "error",
      };
    }
  } catch (error) {
    const context = { operation: "delete_account" as const, requestId };
    const mapped = toUserFacingError(error, context);
    logUserFacingError(error, mapped, context);

    return {
      code: "UNKNOWN",
      message: "Não foi possível concluir a exclusão agora. Tente novamente.",
      status: "error",
    };
  }

  redirect("/conta-excluida");
}
