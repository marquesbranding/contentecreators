"use server";

import "server-only";

import type { AdminModerationAction } from "../../schemas/admin-moderation-command-schema";
import { createServerAdminModerationService } from "../services/server-admin-moderation.service";
import { createAdminModerationActionHandler } from "./admin-moderation-action-handler";
import type { AdminModerationActionState } from "./admin-moderation-action.types";

async function applyAction(
  action: AdminModerationAction,
  formData: FormData,
): Promise<AdminModerationActionState> {
  const handler = createAdminModerationActionHandler({
    createRequestId: () => crypto.randomUUID(),
    createService: createServerAdminModerationService,
  });

  return handler(action, formData);
}

export async function approveAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("APPROVE", formData);
}

export async function requestAccountChangesAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("REQUEST_CHANGES", formData);
}

export async function suspendAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("SUSPEND", formData);
}

export async function restoreAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("RESTORE", formData);
}

export async function banAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("BAN", formData);
}

export async function unbanAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("UNBAN", formData);
}

export async function archiveAccountAction(
  _previousState: AdminModerationActionState,
  formData: FormData,
) {
  return applyAction("ARCHIVE", formData);
}
