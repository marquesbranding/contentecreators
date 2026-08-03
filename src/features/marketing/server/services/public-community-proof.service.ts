import "server-only";

import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";

interface PublicCommunityProofServiceDependencies {
  loadProof(): Promise<PublicCommunityProofDto>;
}

function hasPublicProof(proof: PublicCommunityProofDto) {
  return proof.companies.length > 0 || proof.creators.length > 0;
}

export function createPublicCommunityProofService({
  loadProof,
}: PublicCommunityProofServiceDependencies) {
  return {
    async load(): Promise<PublicCommunityProofDto | null> {
      try {
        const proof = await loadProof();

        return hasPublicProof(proof) ? proof : null;
      } catch {
        return null;
      }
    },
  };
}
