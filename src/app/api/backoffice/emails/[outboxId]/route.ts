import type { NextRequest } from "next/server";

import { createServerAdminEmailOutboxDetailRouteHandler } from "@/features/communications/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ outboxId: string }> },
) {
  const { outboxId } = await params;
  const handler = await createServerAdminEmailOutboxDetailRouteHandler();

  return handler(request, outboxId);
}
