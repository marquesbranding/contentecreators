import type { RegistrationIntent } from "../types/auth.types";

export function parseRegistrationIntent(
  value: unknown,
): RegistrationIntent | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "INFLUENCER" || normalized === "COMPANY") {
    return normalized;
  }

  return undefined;
}

export function buildRoleSelectionPath(intent?: RegistrationIntent) {
  if (!intent) {
    return "/onboarding/role";
  }

  return `/onboarding/role?intent=${intent.toLowerCase()}`;
}
