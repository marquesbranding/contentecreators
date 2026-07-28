import type { NextRequest } from "next/server";

import { createServerAdminEmailOutboxListRouteHandler } from "@/features/communications/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = await createServerAdminEmailOutboxListRouteHandler();

  return handler(request);
}
