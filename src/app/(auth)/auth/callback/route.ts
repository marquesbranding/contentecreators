import { NextResponse, type NextRequest } from "next/server";

import { sanitizeAuthReturnPath } from "@/features/identity";
import {
  createServerBannedAccountDefenseService,
  createServerIdentityAuthService,
} from "@/features/identity/server";
import { createServerOnboardingRegistrationService } from "@/features/onboarding/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const destination = sanitizeAuthReturnPath(
    request.nextUrl.searchParams.get("next"),
  );
  const service = await createServerIdentityAuthService();
  const result = await service.exchangeCallback(code);

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

  const identity = await service.requireVerifiedIdentity();
  if (identity.kind === "verified") {
    const onboardingService = await createServerOnboardingRegistrationService();
    await onboardingService.finalizePreparedRegistration(identity.identityId);
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
