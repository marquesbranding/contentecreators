import { NextResponse, type NextRequest } from "next/server";

import { sanitizeAuthReturnPath } from "@/features/identity";
import {
  createServerBannedAccountDefenseService,
  createServerIdentityAuthService,
} from "@/features/identity/server";
import { createServerOnboardingRegistrationService } from "@/features/onboarding/server";

const preparedEmailOnboardingDestinations = new Set([
  "/onboarding/company",
  "/onboarding/influencer",
]);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const destination = sanitizeAuthReturnPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (destination === "/reset-password" && code.trim()) {
    const resetPasswordUrl = new URL("/reset-password", request.url);
    resetPasswordUrl.searchParams.set("code", code);

    return NextResponse.redirect(resetPasswordUrl);
  }

  const authService = await createServerIdentityAuthService();
  const result = await authService.exchangeCallback(code);

  if (result.kind === "failure") {
    const loginPath = destination.startsWith("/backoffice")
      ? "/backoffice/login"
      : "/login";

    return NextResponse.redirect(
      new URL(`${loginPath}?error=callback`, request.url),
    );
  }

  const defense = await createServerBannedAccountDefenseService();
  const access = await defense.enforce(crypto.randomUUID());

  if (access.kind === "blocked") {
    return NextResponse.redirect(new URL(access.destination, request.url));
  }

  if (preparedEmailOnboardingDestinations.has(destination)) {
    const identity = await authService.requireVerifiedIdentity();

    if (identity.kind === "verified") {
      const onboardingService =
        await createServerOnboardingRegistrationService();
      const onboardingResult =
        await onboardingService.finalizePreparedEmailRegistration(
          identity.identityId,
        );

      if (onboardingResult.kind === "redirect") {
        const analysisUrl = new URL(onboardingResult.destination, request.url);
        analysisUrl.searchParams.set("confirmed", "1");

        return NextResponse.redirect(analysisUrl);
      }
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
