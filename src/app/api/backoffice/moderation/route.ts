import type { NextRequest } from "next/server";

import { createServerModerationQueueRouteHandler } from "@/features/backoffice/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = await createServerModerationQueueRouteHandler();

  return handler(request);
}
