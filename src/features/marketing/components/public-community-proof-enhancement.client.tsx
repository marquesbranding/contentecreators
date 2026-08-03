"use client";

import { fetchPublicCommunityProof } from "../api/public-community-proof.api";
import { useOptionalPublicData } from "@/shared/hooks/use-optional-public-data";

import { PublicCommunityProof } from "./public-community-proof";

export function PublicCommunityProofEnhancement() {
  const proof = useOptionalPublicData(fetchPublicCommunityProof);

  return <PublicCommunityProof proof={proof} />;
}
