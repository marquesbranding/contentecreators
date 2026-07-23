"use server";

import "server-only";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { roleSelectionSchema } from "../../schemas/role-selection-schema";
import type { RoleSelectionActionState } from "../../types/role-selection.types";
import { createServerRoleSelectionService } from "../services/server-role-selection.service";

export async function selectRoleAction(
  _previousState: RoleSelectionActionState,
  formData: FormData,
): Promise<RoleSelectionActionState> {
  const parsed = roleSelectionSchema.safeParse({
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      message: "Selecione uma opção para continuar.",
      roleError:
        parsed.error.issues[0]?.message ??
        "Escolha como você vai usar a plataforma.",
      status: "error",
    };
  }

  const service = await createServerRoleSelectionService();
  let result: Awaited<ReturnType<typeof service.selectRole>>;

  try {
    result = await service.selectRole({
      requestId: randomUUID(),
      role: parsed.data.role,
    });
  } catch {
    return {
      message:
        "Não foi possível confirmar o tipo de perfil agora. Tente novamente.",
      status: "error",
    };
  }

  if (result.kind === "redirect" || result.kind === "authentication_redirect") {
    redirect(result.destination);
  }

  return {
    message: result.message,
    status: "error",
  };
}
