import { type NextRequest } from "next/server";

import { createServerLandingShowcaseManagementRouteHandlers } from "@/features/landing-showcase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const handlers = await createServerLandingShowcaseManagementRouteHandlers();

  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const handlers = await createServerLandingShowcaseManagementRouteHandlers();

  return handlers.POST(request);
}
