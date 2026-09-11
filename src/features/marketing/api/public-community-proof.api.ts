import type {
  PublicCommunityCompanyDto,
  PublicCommunityProofDto,
} from "../types/public-community-proof.types";
import {
  hasOnlyKeys,
  isRecord,
  parseOptionalText,
  parseText,
} from "./public-payload";

const MAX_COMPANIES = 10;

const allowedRootKeys = new Set(["companies"]);
const allowedCompanyKeys = new Set([
  "city",
  "companyId",
  "segment",
  "state",
  "tradeName",
]);

function parseCompany(value: unknown): PublicCommunityCompanyDto | null {
  if (!isRecord(value) || !hasOnlyKeys(value, allowedCompanyKeys)) {
    return null;
  }

  const companyId = parseText(value.companyId, 80);
  const tradeName = parseText(value.tradeName, 160);

  if (!companyId || !tradeName) {
    return null;
  }

  return {
    city: parseOptionalText(value.city, 120),
    companyId,
    segment: parseOptionalText(value.segment, 120),
    state: parseOptionalText(value.state, 2),
    tradeName,
  };
}

function parsePublicCommunityProof(
  value: unknown,
): PublicCommunityProofDto | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, allowedRootKeys) ||
    !Array.isArray(value.companies)
  ) {
    return null;
  }

  const companies = value.companies
    .map((company) => parseCompany(company))
    .filter((company): company is PublicCommunityCompanyDto => company !== null)
    .slice(0, MAX_COMPANIES);

  // Arrived with entries but lost every one to validation: malformed.
  if (value.companies.length > 0 && companies.length === 0) {
    return null;
  }

  return { companies };
}

type PublicRequest = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "json" | "ok">>;

export async function fetchPublicCommunityProof(
  signal: AbortSignal,
  request: PublicRequest = fetch,
): Promise<PublicCommunityProofDto | null> {
  try {
    const response = await request("/api/public/marketing/community-proof", {
      credentials: "omit",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return parsePublicCommunityProof(await response.json());
  } catch {
    return null;
  }
}
