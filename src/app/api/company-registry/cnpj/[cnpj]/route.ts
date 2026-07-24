import type { NextRequest } from "next/server";

import { createServerCnpjLookupRouteHandler } from "@/features/onboarding/server";

export const runtime = "nodejs";

const handleCnpjLookup = createServerCnpjLookupRouteHandler();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cnpj: string }> },
) {
  return handleCnpjLookup(request, context);
}
