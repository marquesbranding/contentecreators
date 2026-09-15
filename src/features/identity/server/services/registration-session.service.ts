import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerRateLimitService } from "@/features/security/server";
import { getPublicEnv } from "@/shared/lib/env/public-env";
import {
  createRateLimitKey,
  type RateLimitPolicyName,
} from "@/shared/server/security/rate-limit";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";
import { createRegistrationIdentityRepository } from "../repositories/registration-identity.repository";
import { getAccountDestination } from "../../domain/account-route-decision";

export async function consumeRegistrationLimit(
  email: string,
  policy: RateLimitPolicyName = "signUp",
) {
  const requestHeaders = await headers();
  const network =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const service = createServerRateLimitService();
  const decisions = await Promise.all([
    service.consume({ key: createRateLimitKey([`email:${email}`]), policy }),
    service.consume({
      key: createRateLimitKey([`network:${network}`]),
      policy,
    }),
  ]);
  return decisions.every((decision) => decision.allowed);
}

export async function sendRegistrationCode(
  email: string,
  shouldCreateUser = true,
) {
  const client = await createServerSupabaseClient();
  const callback = new URL(
    "/auth/callback",
    getPublicEnv().NEXT_PUBLIC_APP_URL,
  );
  callback.searchParams.set("next", "/sign-up/account");
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
      emailRedirectTo: callback.toString(),
      // GoTrue creates a random password hash for OTP users. It is not a user-defined password.
      ...(shouldCreateUser
        ? { data: { registration_password_pending: true } }
        : {}),
    },
  });
  if (error) throw error;
  const cookieStore = await cookies();
  cookieStore.set("cc_signup_email", email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 1800,
  });
}

export async function loadRegistrationAccount() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) redirect("/sign-up");
  const account = await createRegistrationIdentityRepository().ensure(
    user.id,
    user.email,
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : user.user_metadata.name,
  );
  if (account.archivedAt) redirect("/app/status/blocked");
  if (
    account.status !== "ONBOARDING" ||
    (account.role && account.registrationStep !== "ACCOUNT_DETAILS")
  ) {
    redirect(getAccountDestination(account));
  }
  const identity = await createRegistrationIdentityRepository().lookup(
    user.email,
  );
  const isGoogle =
    user.identities?.some((item) => item.provider === "google") ?? false;
  return {
    account,
    user,
    requiresPassword:
      !isGoogle && !(identity.status === "registered" && identity.hasPassword),
  };
}

export async function ensureCurrentOnboardingAccount() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return createRegistrationIdentityRepository().ensure(
    user.id,
    user.email,
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : user.user_metadata.name,
  );
}

export async function verifyRegistrationEmailLink(tokenHash: string) {
  if (!/^(?:pkce_)?[a-f0-9]{56,64}$/i.test(tokenHash))
    return { kind: "failure" as const };
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  return { kind: error ? ("failure" as const) : ("success" as const) };
}
