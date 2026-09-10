import "server-only";

import type {
  PublicCommunityAvatarDto,
  PublicCommunityAvatarSource,
  PublicCommunityCreatorSource,
  PublicCommunityProofDto,
  PublicCommunityProofSource,
} from "../../types/public-community-proof.types";

interface PublicCommunityProofServiceDependencies {
  loadProof(): Promise<PublicCommunityProofSource>;
  /**
   * Turns private storage coordinates into a short-lived public URL. Omitted
   * (or returning `null`) leaves the card on its initials fallback, which is
   * why a storage outage never removes the section.
   */
  signAvatar?(
    source: PublicCommunityAvatarSource,
  ): Promise<PublicCommunityAvatarDto | null>;
}

function hasPublicProof(proof: PublicCommunityProofDto) {
  return proof.companies.length > 0 || proof.creators.length > 0;
}

export function createPublicCommunityProofService({
  loadProof,
  signAvatar,
}: PublicCommunityProofServiceDependencies) {
  async function toCreatorDto({
    avatarSource,
    ...creator
  }: PublicCommunityCreatorSource) {
    if (!avatarSource || !signAvatar) {
      return { ...creator, avatar: null };
    }

    try {
      return { ...creator, avatar: await signAvatar(avatarSource) };
    } catch {
      return { ...creator, avatar: null };
    }
  }

  return {
    async load(): Promise<PublicCommunityProofDto | null> {
      try {
        const source = await loadProof();
        const proof: PublicCommunityProofDto = {
          companies: source.companies,
          creators: await Promise.all(source.creators.map(toCreatorDto)),
        };

        return hasPublicProof(proof) ? proof : null;
      } catch {
        return null;
      }
    },
  };
}
