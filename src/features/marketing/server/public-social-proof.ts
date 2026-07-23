import "server-only";

export const publicSocialProofEnabled = false as const;

export function assertPublicSocialProofDisabled() {
  return publicSocialProofEnabled;
}
