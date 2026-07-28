import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { createCatalogDetailRouteHandler } from "@/features/catalog/server";

import { loadServerCatalogDetail } from "@/app/_server/catalog-detail.loader";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ creatorId: string }> },
) {
  const handler = createCatalogDetailRouteHandler({
    load: loadServerCatalogDetail,
    requestIdFactory: randomUUID,
  });

  return handler(request, context);
}
