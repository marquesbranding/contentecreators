import "server-only";

import { z } from "zod";

import type { OperationalLogInput } from "@/shared/server/observability/operational-logger";

import {
  adminModerationCommandSchema,
  type AdminModerationAction,
  type AdminModerationCommand,
} from "../../schemas/admin-moderation-command-schema";
import type { AdminModerationTransition } from "../services/admin-moderation.service";
import type {
  AdminModerationActionField,
  AdminModerationActionState,
} from "./admin-moderation-action.types";

const reasonRequiredActions = new Set<AdminModerationAction>([
  "ARCHIVE",
  "BAN",
  "REQUEST_CHANGES",
  "RESTORE",
  "SUSPEND",
  "UNBAN",
]);

const rawActionInputSchema = z
  .object({
    accountId: z.uuid("Selecione um cadastro válido."),
    confirmation: z.string(),
    expectedAccountVersion: z.coerce
      .number()
      .int("A versão da conta é inválida.")
      .positive("A versão da conta é inválida."),
    expectedProfileVersion: z.coerce
      .number()
      .int("A versão do perfil é inválida.")
      .positive("A versão do perfil é inválida."),
    idempotencyKey: z
      .string()
      .trim()
      .min(8, "Não foi possível identificar esta tentativa.")
      .max(160, "Não foi possível identificar esta tentativa."),
    reason: z.string().trim().max(2_000, "O motivo é muito longo."),
  })
  .superRefine((input, context) => {
    if (input.confirmation !== "confirmed") {
      context.addIssue({
        code: "custom",
        message: "Confirme a ação para continuar.",
        path: ["confirmation"],
      });
    }
  });

type AdminModerationApplyResult = AdminModerationTransition & {
  authEffectStatus: "not_required" | "retry_pending" | "synced";
};

interface AdminModerationActionHandlerDependencies {
  consumeCapacity?(): Promise<{ allowed: boolean }>;
  createRequestId(): string;
  createService(): Promise<{
    apply(command: AdminModerationCommand): Promise<AdminModerationApplyResult>;
  }>;
  log?: (event: OperationalLogInput) => void;
}

const successMessages: Record<AdminModerationAction, string> = {
  APPROVE: "Cadastro aprovado com sucesso.",
  ARCHIVE: "Cadastro arquivado com sucesso.",
  BAN: "Cadastro banido e identidade bloqueada.",
  REQUEST_CHANGES: "Solicitação de correções enviada.",
  RESTORE: "Acesso restaurado com sucesso.",
  SUSPEND: "Cadastro suspenso com sucesso.",
  UNBAN: "Banimento removido por recuperação excepcional.",
};

function collectErrorMessages(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      "cause" in error && error.cause ? collectErrorMessages(error.cause) : "";
    return `${error.message} ${cause}`.trim();
  }

  return String(error);
}

function mapModerationError(error: unknown): AdminModerationActionState {
  const message = collectErrorMessages(error);

  if (
    message.includes("admin_moderation_account_stale") ||
    message.includes("admin_moderation_profile_stale")
  ) {
    return {
      code: "STALE_REVIEW",
      message:
        "Este cadastro mudou desde que você abriu a revisão. Recarregue os dados antes de decidir.",
      status: "conflict",
    };
  }

  if (
    message.includes("moderation_admin_required") ||
    message.includes("ACCOUNT_NOT_READY") ||
    message.includes("UNAUTHENTICATED")
  ) {
    return {
      code: "ADMIN_REQUIRED",
      message:
        "Sua sessão não possui mais autorização administrativa. Entre novamente.",
      status: "unauthorized",
    };
  }

  if (
    message.includes("moderated_account_not_found") ||
    message.includes("admin_moderation_case_missing")
  ) {
    return {
      code: "NOT_FOUND",
      message: "Este cadastro não está mais disponível para moderação.",
      status: "error",
    };
  }

  if (message.includes("moderation_self_approval_forbidden")) {
    return {
      code: "SELF_APPROVAL_FORBIDDEN",
      message:
        "Você não pode aprovar ou alterar o status do seu próprio cadastro vinculado. Peça a outro administrador.",
      status: "unauthorized",
    };
  }

  if (message.includes("moderation_idempotency_conflict")) {
    return {
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "Esta tentativa já foi usada para outra decisão. Recarregue e tente novamente.",
      status: "conflict",
    };
  }

  if (
    message.includes("moderation_transition_not_allowed") ||
    message.includes("moderation_unban_target_mismatch") ||
    message.includes("moderation_archive_status_mismatch") ||
    message.includes("moderation_reason_required") ||
    message.includes("moderated_account_archived") ||
    message.includes("admin_moderation_input_invalid")
  ) {
    return {
      code: "INVALID_TRANSITION",
      message: "Esta ação não está disponível para o estado atual do cadastro.",
      status: "error",
    };
  }

  return {
    code: "UNKNOWN",
    message: "Não foi possível concluir a ação agora. Tente novamente.",
    status: "error",
  };
}

export function createAdminModerationActionHandler(
  dependencies: AdminModerationActionHandlerDependencies,
) {
  return async function handleAdminModerationAction(
    action: AdminModerationAction,
    formData: FormData,
  ): Promise<AdminModerationActionState> {
    const parsed = rawActionInputSchema.safeParse({
      accountId: formData.get("accountId"),
      confirmation: formData.get("confirmation"),
      expectedAccountVersion: formData.get("expectedAccountVersion"),
      expectedProfileVersion: formData.get("expectedProfileVersion"),
      idempotencyKey: formData.get("idempotencyKey"),
      reason: formData.get("reason") ?? "",
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Partial<
        Record<AdminModerationActionField, string[] | undefined>
      >;

      return {
        code: fieldErrors.confirmation
          ? "CONFIRMATION_REQUIRED"
          : "VALIDATION_ERROR",
        fieldErrors,
        message: "Revise os campos destacados.",
        status: "error",
      };
    }

    if (
      reasonRequiredActions.has(action) &&
      parsed.data.reason.trim().length < 3
    ) {
      return {
        code: "VALIDATION_ERROR",
        fieldErrors: {
          reason: ["Informe um motivo com pelo menos 3 caracteres."],
        },
        message: "Revise os campos destacados.",
        status: "error",
      };
    }

    if (
      dependencies.consumeCapacity &&
      !(await dependencies.consumeCapacity()).allowed
    ) {
      return {
        code: "RATE_LIMITED",
        message:
          "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
        status: "error",
      };
    }

    const commandResult = adminModerationCommandSchema.safeParse({
      accountId: parsed.data.accountId,
      action,
      expectedAccountVersion: parsed.data.expectedAccountVersion,
      expectedProfileVersion: parsed.data.expectedProfileVersion,
      idempotencyKey: parsed.data.idempotencyKey,
      reason: parsed.data.reason || null,
      requestId: dependencies.createRequestId(),
    });

    if (!commandResult.success) {
      return {
        code: "VALIDATION_ERROR",
        message: "Revise os dados da ação e tente novamente.",
        status: "error",
      };
    }

    try {
      const service = await dependencies.createService();
      const result = await service.apply(commandResult.data);
      dependencies.log?.({
        accountStatus: result.status,
        event:
          action === "BAN" || action === "UNBAN"
            ? "ban_transition"
            : "moderation_transition",
        operation: action.toLowerCase(),
        outcome: "success",
        requestId: commandResult.data.requestId,
      });

      return {
        message: successMessages[action],
        result: {
          accountId: result.accountId,
          accountVersion: result.accountVersion,
          action: result.action,
          kind: result.kind,
          profileVersion: result.profileVersion,
          status: result.status,
        },
        status: "success",
      };
    } catch (error) {
      const mappedError = mapModerationError(error);
      dependencies.log?.({
        errorCategory: mappedError.code,
        event:
          mappedError.code === "ADMIN_REQUIRED"
            ? "authorization_denied"
            : action === "BAN" || action === "UNBAN"
              ? "ban_transition"
              : "moderation_transition",
        operation: action.toLowerCase(),
        outcome: mappedError.status,
        requestId: commandResult.data.requestId,
      });
      return mappedError;
    }
  };
}
