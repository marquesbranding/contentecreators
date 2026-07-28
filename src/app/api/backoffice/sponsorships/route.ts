import { type NextRequest } from "next/server";

import { createServerSponsorshipManagementRouteHandlers } from "@/features/sponsorships/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const handlers = await createServerSponsorshipManagementRouteHandlers();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const handlers = await createServerSponsorshipManagementRouteHandlers();
  return handlers.POST(request);
}
