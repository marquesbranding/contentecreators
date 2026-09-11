import "server-only";

import { loadServerPublicCommunityProof } from "../repositories/drizzle-public-community-proof.repository";
import { createPublicCommunityProofService } from "./public-community-proof.service";

export function createServerPublicCommunityProofService() {
  return createPublicCommunityProofService({
    loadProof: loadServerPublicCommunityProof,
  });
}

export function loadPublicCommunityProof() {
  return createServerPublicCommunityProofService().load();
}
