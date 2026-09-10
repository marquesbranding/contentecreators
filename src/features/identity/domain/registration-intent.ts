import type {
  RegistrationIntent,
  SignUpAccountIntent,
} from "../types/auth.types";

/**
 * The account role carried through the Google/role-selection flow. `ugc`
 * collapses to `INFLUENCER` because both are influencer accounts — the UGC
 * subtype lives in `creator_type`, which that flow asks for separately.
 */
export function parseRegistrationIntent(
  value: unknown,
): RegistrationIntent | undefined {
  const accountIntent = parseSignUpAccountIntent(value);

  if (!accountIntent) {
    return undefined;
  }

  return accountIntent === "COMPANY" ? "COMPANY" : "INFLUENCER";
}

/** The account-type card the signup wizard should open pre-selected. */
export function parseSignUpAccountIntent(
  value: unknown,
): SignUpAccountIntent | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (
    normalized === "INFLUENCER" ||
    normalized === "UGC" ||
    normalized === "COMPANY"
  ) {
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
