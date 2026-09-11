"use client";

import { useOptionalPublicData } from "@/shared/hooks/use-optional-public-data";

import { fetchPublicCommunityProof } from "../api/public-community-proof.api";
import { fetchPublicLandingShowcase } from "../api/public-landing-showcase.api";
import { PublicCommunityProof } from "./public-community-proof";

export function PublicCommunityProofEnhancement() {
  const proof = useOptionalPublicData(fetchPublicCommunityProof);
  const showcase = useOptionalPublicData(fetchPublicLandingShowcase);

  return <PublicCommunityProof proof={proof} showcase={showcase} />;
}
