import {
  createPublicCommunityProofRouteHandler,
  loadPublicCommunityProof,
} from "@/features/marketing/server";

export const runtime = "nodejs";

export const GET = createPublicCommunityProofRouteHandler({
  load: loadPublicCommunityProof,
});
