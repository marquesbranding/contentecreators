import type { NextRequest } from "next/server";

import { createServerBackofficeAnalyticsRouteHandler } from "@/features/backoffice/server";
import { PROFILE_COMPLETION_VERSION } from "@/features/onboarding";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = await createServerBackofficeAnalyticsRouteHandler(
    PROFILE_COMPLETION_VERSION,
  );

  return handler(request);
}
