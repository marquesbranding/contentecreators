import type { NextRequest } from "next/server";

import { updateProxyAuthSession } from "@/features/identity/server";

export function proxy(request: NextRequest) {
  return updateProxyAuthSession(request);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/auth/:path*",
    "/backoffice/:path*",
    "/confirm-email",
    "/forgot-password",
    "/login",
    "/onboarding/:path*",
    "/reset-password",
    "/sign-up",
  ],
};
