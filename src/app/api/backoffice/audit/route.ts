import type { NextRequest } from "next/server";

import { createServerAuditHistoryRouteHandler } from "@/features/audit/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = await createServerAuditHistoryRouteHandler();

  return handler(request);
}
