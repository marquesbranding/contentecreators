import { type NextRequest } from "next/server";

import { createServerSponsorshipManagementRouteHandlers } from "@/features/sponsorships/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ placementId: string }> },
) {
  const { placementId } = await context.params;
  const handlers = await createServerSponsorshipManagementRouteHandlers();

  return handlers.PATCH(request, placementId);
}
