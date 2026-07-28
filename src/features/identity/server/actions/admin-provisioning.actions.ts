"use server";

import "server-only";

import { adminProvisioningSchema } from "../../schemas/admin-provisioning-schema";
import type {
  AdminProvisioningActionState,
  AdminProvisioningFieldName,
} from "../../types/admin-provisioning.types";
import { consumeIdentityRateLimit } from "@/features/security/server";

import { createServerAdminProvisioningService } from "../services/server-admin-provisioning.service";

const rejectionMessages = {
  ADMIN_CONFLICT:
    "Esta identidade já possui um perfil incompatível com o papel administrativo.",
  ADMIN_REQUIRED: "Sua sessão não possui mais autorização administrativa.",
  IDENTITY_INVITE_FAILED:
    "Não foi possível criar ou enviar o convite agora. Tente novamente.",
  INITIAL_ADMIN_ALREADY_EXISTS:
    "O administrador inicial já foi definido neste ambiente.",
} as const;

export async function provisionAdditionalAdminAction(
  _previousState: AdminProvisioningActionState,
  formData: FormData,
): Promise<AdminProvisioningActionState> {
  const parsed = adminProvisioningSchema.safeParse({
    email: formData.get("email"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Partial<
      Record<AdminProvisioningFieldName, string[]>
    >;

    return {
      fieldErrors,
      message: "Revise os campos destacados.",
      status: "error",
      values: {
        email: String(formData.get("email") ?? ""),
      },
    };
  }

  const capacity = await consumeIdentityRateLimit("adminCommand");
  if (!capacity.allowed) {
    return {
      message:
        "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
      status: "error",
      values: { email: parsed.data.email },
    };
  }

  const service = await createServerAdminProvisioningService();
  const result = await service.provisionAdditional({
    ...parsed.data,
    requestId: crypto.randomUUID(),
  });

  if (result.kind === "rejected") {
    const message =
      result.code === "EMAIL_INVALID"
        ? "Informe um e-mail válido."
        : result.code === "REASON_REQUIRED"
          ? "Informe o motivo do provisionamento."
          : (rejectionMessages[result.code as keyof typeof rejectionMessages] ??
            "Não foi possível concluir o provisionamento.");

    return {
      message,
      status: "error",
      values: {
        email: parsed.data.email,
      },
    };
  }

  return {
    message:
      result.kind === "already_provisioned"
        ? "Este administrador já estava provisionado."
        : "Convite enviado e acesso administrativo provisionado.",
    status: "success",
  };
}
