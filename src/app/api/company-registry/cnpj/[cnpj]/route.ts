import { NextResponse, type NextRequest } from "next/server";

import {
  consumeCnpjLookupCapacity,
  createServerBrasilApiCnpjService,
} from "@/features/onboarding/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cnpj: string }> },
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const networkKey =
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  if (!consumeCnpjLookupCapacity(networkKey)) {
    return NextResponse.json(
      { status: "rate_limited" },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const { cnpj } = await context.params;
  const service = createServerBrasilApiCnpjService();
  const result = await service.lookup(cnpj);

  return NextResponse.json(result, {
    headers: {
      "cache-control":
        result.status === "success"
          ? "private, max-age=300, stale-while-revalidate=600"
          : "no-store",
    },
  });
}
