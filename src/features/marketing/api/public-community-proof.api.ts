import type {
  PublicCommunityCompanyDto,
  PublicCommunityCreatorDto,
  PublicCommunityCreatorMetricDto,
  PublicCommunityCreatorType,
  PublicCommunityNicheDto,
  PublicCommunityProofDto,
  PublicCommunitySocialPlatform,
} from "../types/public-community-proof.types";

const allowedRootKeys = new Set(["companies", "creators"]);
const allowedCompanyKeys = new Set([
  "city",
  "companyId",
  "segment",
  "state",
  "tradeName",
]);
const allowedCreatorKeys = new Set([
  "bioExcerpt",
  "city",
  "creatorId",
  "creatorType",
  "displayName",
  "metric",
  "niches",
  "state",
]);
const allowedMetricKeys = new Set([
  "engagementRate",
  "followerCount",
  "platform",
]);
const allowedNicheKeys = new Set(["name", "slug"]);
const allowedCreatorTypes = new Set<PublicCommunityCreatorType>([
  "INFLUENCER",
  "UGC",
]);
const allowedPlatforms = new Set<PublicCommunitySocialPlatform>([
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "OTHER",
  "TIKTOK",
  "X",
  "YOUTUBE",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function parseText(value: unknown, maxLength: number): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function parseOptionalText(value: unknown, maxLength: number): string | null {
  return value === null ? null : parseText(value, maxLength);
}

function parseNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function parseMetric(value: unknown): PublicCommunityCreatorMetricDto | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value) || !hasOnlyKeys(value, allowedMetricKeys)) {
    return null;
  }

  if (
    typeof value.platform !== "string" ||
    !allowedPlatforms.has(value.platform as PublicCommunitySocialPlatform)
  ) {
    return null;
  }

  return {
    engagementRate: parseNumber(value.engagementRate),
    followerCount: parseNumber(value.followerCount),
    platform: value.platform as PublicCommunitySocialPlatform,
  };
}

function parseNiche(value: unknown): PublicCommunityNicheDto | null {
  if (!isRecord(value) || !hasOnlyKeys(value, allowedNicheKeys)) {
    return null;
  }

  const name = parseText(value.name, 120);
  const slug = parseText(value.slug, 80);

  return name && slug ? { name, slug } : null;
}

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

function parseCreator(value: unknown): PublicCommunityCreatorDto | null {
  if (!isRecord(value) || !hasOnlyKeys(value, allowedCreatorKeys)) {
    return null;
  }

  const creatorId = parseText(value.creatorId, 80);
  const displayName = parseText(value.displayName, 120);

  if (
    !creatorId ||
    !displayName ||
    typeof value.creatorType !== "string" ||
    !allowedCreatorTypes.has(value.creatorType as PublicCommunityCreatorType) ||
    !Array.isArray(value.niches)
  ) {
    return null;
  }

  const niches = value.niches
    .map((niche) => parseNiche(niche))
    .filter((niche): niche is PublicCommunityNicheDto => niche !== null)
    .slice(0, 4);

  return {
    bioExcerpt: parseOptionalText(value.bioExcerpt, 130),
    city: parseOptionalText(value.city, 120),
    creatorId,
    creatorType: value.creatorType as PublicCommunityCreatorType,
    displayName,
    metric: parseMetric(value.metric),
    niches,
    state: parseOptionalText(value.state, 2),
  };
}

function parsePublicCommunityProof(
  value: unknown,
): PublicCommunityProofDto | null {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, allowedRootKeys) ||
    !Array.isArray(value.companies) ||
    !Array.isArray(value.creators)
  ) {
    return null;
  }

  const proof = {
    companies: value.companies
      .map((company) => parseCompany(company))
      .filter(
        (company): company is PublicCommunityCompanyDto => company !== null,
      )
      .slice(0, 10),
    creators: value.creators
      .map((creator) => parseCreator(creator))
      .filter(
        (creator): creator is PublicCommunityCreatorDto => creator !== null,
      )
      .slice(0, 3),
  };

  return proof.companies.length > 0 || proof.creators.length > 0 ? proof : null;
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
