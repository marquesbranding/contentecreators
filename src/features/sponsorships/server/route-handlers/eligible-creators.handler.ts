import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  AccountAccessError,
  VerifiedAccountTransactionError,
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
} from "@/features/identity/server";
import { getServerSignedMedia } from "@/features/media/server";
import {
  eligibleCreatorsQuerySchema,
  eligibleCreatorsResponseSchema,
} from "../../api/eligible-creators.contract";
import { findEligibleCreators } from "../repositories/eligible-creators.repository";
export async function getEligibleSponsorshipCreators(request: NextRequest) {
  const headers = { "cache-control": "private, no-store" };
  const parsed = eligibleCreatorsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { message: "Busca inválida." },
      { status: 422, headers },
    );
  try {
    const run = await createServerVerifiedAccountTransactionRunner();
    const rows = await run(
      { requestId: randomUUID() },
      async (transaction, actor) => {
        requireAdmin({
          id: actor.accountId,
          role: actor.role,
          status: actor.status,
        });
        return findEligibleCreators(
          transaction,
          parsed.data.search,
          parsed.data.selectedId,
        );
      },
    );
    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        displayName: row.displayName,
        location: [row.city, row.state].filter(Boolean).join(" · ") || null,
        avatarUrl: row.avatarAssetId
          ? ((await getServerSignedMedia(row.avatarAssetId))?.url ?? null)
          : null,
      })),
    );
    return NextResponse.json(eligibleCreatorsResponseSchema.parse({ items }), {
      headers,
    });
  } catch (error) {
    const status =
      error instanceof VerifiedAccountTransactionError
        ? error.code === "UNAUTHENTICATED"
          ? 401
          : 403
        : error instanceof AccountAccessError
          ? 403
          : 500;
    return NextResponse.json(
      { message: "Não foi possível consultar os criadores." },
      { status, headers },
    );
  }
}
