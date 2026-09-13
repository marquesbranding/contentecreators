import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import type {
  RegistrationIdentityFailureReason,
  RegistrationIdentityGateway,
} from "./onboarding-registration.service";

const failureReasonsByCode: Record<string, RegistrationIdentityFailureReason> =
  {
    email_address_invalid: "invalid_email",
    email_address_not_authorized: "invalid_email",
    over_email_send_rate_limit: "rate_limited",
    over_request_rate_limit: "rate_limited",
    weak_password: "weak_password",
  };

function isAccountAlreadyRegisteredError(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  );
}

// Supabase Auth answers 5xx when it cannot send the confirmation email (for
// example, an SMTP outage) and supabase-js surfaces it without an error code.
function isConfirmationEmailDeliveryError(error: {
  message?: string;
  status?: number;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    (error.status !== undefined && error.status >= 500) ||
    message.includes("error sending") ||
    message.includes("smtp")
  );
}

export function createSupabaseRegistrationIdentityGateway(
  authClient: SupabaseClient,
  adminClient: SupabaseClient,
): RegistrationIdentityGateway {
  return {
    async deleteIdentity(identityId) {
      await adminClient.auth.admin.deleteUser(identityId, true);
    },

    async signUp({ callbackUrl, email, password }) {
      const { data, error } = await authClient.auth.signUp({
        email,
        options: { emailRedirectTo: callbackUrl },
        password,
      });

      if (error) {
        if (isAccountAlreadyRegisteredError(error)) {
          return { kind: "account_exists" };
        }

        if (isConfirmationEmailDeliveryError(error)) {
          operationalLogger.error({
            details: { status: error.status ?? null },
            errorCategory: error.code ?? "confirmation_email_delivery",
            event: "email_delivery_failure",
            operation: "registration_confirmation_email",
            outcome: "fallback_identity_without_email",
            provider: "supabase_auth",
            requestId: crypto.randomUUID(),
          });

          const fallback = await adminClient.auth.admin.createUser({
            email,
            email_confirm: false,
            password,
          });

          if (fallback.error || !fallback.data.user) {
            const fallbackCode = fallback.error?.code ?? "missing_user";

            if (
              fallback.error &&
              isAccountAlreadyRegisteredError(fallback.error)
            ) {
              return { kind: "account_exists" };
            }

            operationalLogger.error({
              errorCategory: fallbackCode,
              event: "onboarding_submission_failure",
              operation: "registration_identity_fallback",
              outcome: "provider",
              provider: "supabase_auth",
              requestId: crypto.randomUUID(),
            });

            return { code: fallbackCode, kind: "failure", reason: "provider" };
          }

          return {
            confirmationEmailSent: false,
            confirmationRequired: true,
            identityId: fallback.data.user.id,
            kind: "success",
          };
        }

        const code = error.code ?? "unknown";
        const reason = failureReasonsByCode[code] ?? "provider";

        operationalLogger.warn({
          details: { status: error.status ?? null },
          errorCategory: code,
          event: "onboarding_submission_failure",
          operation: "registration_identity_sign_up",
          outcome: reason,
          provider: "supabase_auth",
          requestId: crypto.randomUUID(),
        });

        return { code, kind: "failure", reason };
      }

      if (data.user && data.user.identities?.length === 0) {
        return { kind: "account_exists" };
      }

      if (!data.user) {
        return { code: "missing_user", kind: "failure", reason: "provider" };
      }

      return {
        confirmationEmailSent: true,
        confirmationRequired: data.session === null,
        identityId: data.user.id,
        kind: "success",
      };
    },
  };
}
