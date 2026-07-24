import { NextResponse, type NextRequest } from "next/server";

import { createServerBackofficeAuthService } from "@/features/identity/server";

export async function GET(request: NextRequest) {
  const service = await createServerBackofficeAuthService();
  const result = await service.completeGoogleSignIn(
    request.nextUrl.searchParams.get("next"),
    crypto.randomUUID(),
  );

  return NextResponse.redirect(
    new URL(
      result.kind === "redirect"
        ? result.destination
        : "/backoffice/login?error=unauthorized",
      request.url,
    ),
  );
}
