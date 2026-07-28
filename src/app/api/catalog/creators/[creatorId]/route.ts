import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { createCatalogDetailRouteHandler } from "@/features/catalog/server";
import { consumeIdentityRateLimit } from "@/features/security/server";

import { loadServerCatalogDetail } from "@/app/_server/catalog-detail.loader";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ creatorId: string }> },
) {
  const handler = createCatalogDetailRouteHandler({
    consumeContactCapacity: () =>
      consumeIdentityRateLimit("contactReveal", "anonymous-catalog-detail"),
    load: loadServerCatalogDetail,
    requestIdFactory: randomUUID,
  });

  return handler(request, context);
}
