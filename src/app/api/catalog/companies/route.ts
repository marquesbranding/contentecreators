import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { createCompanyCarouselRouteHandler } from "@/features/catalog/server";

import { loadServerCompanyCarousel } from "@/app/_server/company-carousel.loader";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handler = createCompanyCarouselRouteHandler({
    list: loadServerCompanyCarousel,
    requestIdFactory: randomUUID,
  });

  return handler(request);
}
