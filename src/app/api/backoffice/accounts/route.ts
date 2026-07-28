import type { NextRequest } from "next/server";

import { createServerAccountManagementRouteHandler } from "@/features/backoffice/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = await createServerAccountManagementRouteHandler();

  return handler(request);
}
