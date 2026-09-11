import "server-only";

import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";

interface PublicCommunityProofServiceDependencies {
  loadProof(): Promise<PublicCommunityProofDto>;
}

export function createPublicCommunityProofService({
  loadProof,
}: PublicCommunityProofServiceDependencies) {
  return {
    async load(): Promise<PublicCommunityProofDto | null> {
      try {
        // An empty list is still an answer; `null` means "could not load".
        return await loadProof();
      } catch {
        return null;
      }
    },
  };
}
