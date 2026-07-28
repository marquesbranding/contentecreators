import { createServerHealthRouteHandlers } from "@/features/health/server";

export const dynamic = "force-dynamic";

const handlers = createServerHealthRouteHandlers();

export async function GET(request: Request) {
  return handlers.live(request);
}
