import type {
  PublicCommunityCreatorMetricDto,
  PublicCommunityCreatorType,
  PublicCommunityNicheDto,
  PublicCommunitySocialPlatform,
} from "../types/public-community-proof.types";
import type {
  PublicLandingShowcaseDto,
  PublicShowcaseCompanyDto,
  PublicShowcaseCreatorDto,
  PublicShowcaseItemDto,
} from "../types/public-landing-showcase.types";
import {
  hasOnlyKeys,
  isRecord,
  parseNumber,
  parseOptionalText,
  parseSignedImage,
  parseText,
} from "./public-payload";

const MAX_SHOWCASE_ITEMS = 24;

const allowedRootKeys = new Set(["items"]);
const allowedCreatorKeys = new Set([
  "avatar",
  "bioExcerpt",
  "city",
  "creatorType",
  "displayName",
  "id",
  "kind",
  "metric",
  "niches",
  "state",
]);
const allowedCompanyKeys = new Set([
  "city",
  "id",
  "kind",
  "logo",
  "segment",
  "state",
  "tradeName",
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

function parseImageField(value: unknown) {
  return value === null || value === undefined ? null : parseSignedImage(value);
}

function parseMetric(value: unknown): PublicCommunityCreatorMetricDto | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, allowedMetricKeys) ||
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

function parseCreator(
  value: Record<string, unknown>,
): PublicShowcaseCreatorDto | null {
  if (!hasOnlyKeys(value, allowedCreatorKeys)) {
    return null;
  }

  const id = parseText(value.id, 80);
  const displayName = parseText(value.displayName, 120);

  if (
    !id ||
    !displayName ||
    typeof value.creatorType !== "string" ||
    !allowedCreatorTypes.has(value.creatorType as PublicCommunityCreatorType) ||
    !Array.isArray(value.niches)
  ) {
    return null;
  }

  return {
    avatar: parseImageField(value.avatar),
    bioExcerpt: parseOptionalText(value.bioExcerpt, 130),
    city: parseOptionalText(value.city, 120),
    creatorType: value.creatorType as PublicCommunityCreatorType,
    displayName,
    id,
    kind: "CREATOR",
    metric: value.metric === null ? null : parseMetric(value.metric),
    niches: value.niches
      .map((niche) => parseNiche(niche))
      .filter((niche): niche is PublicCommunityNicheDto => niche !== null)
      .slice(0, 4),
    state: parseOptionalText(value.state, 2),
  };
}

function parseCompany(
  value: Record<string, unknown>,
): PublicShowcaseCompanyDto | null {
  if (!hasOnlyKeys(value, allowedCompanyKeys)) {
    return null;
  }

  const id = parseText(value.id, 80);
  const tradeName = parseText(value.tradeName, 160);

  if (!id || !tradeName) {
    return null;
  }

  return {
    city: parseOptionalText(value.city, 120),
    id,
    kind: "COMPANY",
    logo: parseImageField(value.logo),
    segment: parseOptionalText(value.segment, 120),
    state: parseOptionalText(value.state, 2),
    tradeName,
  };
}

function parseItem(value: unknown): PublicShowcaseItemDto | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.kind === "CREATOR") {
    return parseCreator(value);
  }

  if (value.kind === "COMPANY") {
    return parseCompany(value);
  }

  return null;
}

export function parsePublicLandingShowcase(
  value: unknown,
): PublicLandingShowcaseDto | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, allowedRootKeys) ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  const items = value.items
    .map((item) => parseItem(item))
    .filter((item): item is PublicShowcaseItemDto => item !== null)
    .slice(0, MAX_SHOWCASE_ITEMS);

  /* An empty list is a valid "nobody enabled yet" answer. A list that arrived
   * with entries and lost every one to validation is malformed, and must fail
   * closed rather than render placeholders claiming nobody is featured. */
  if (value.items.length > 0 && items.length === 0) {
    return null;
  }

  return { items };
}

type PublicRequest = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "json" | "ok">>;

export async function fetchPublicLandingShowcase(
  signal: AbortSignal,
  request: PublicRequest = fetch,
): Promise<PublicLandingShowcaseDto | null> {
  try {
    const response = await request("/api/public/marketing/landing-showcase", {
      credentials: "omit",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return parsePublicLandingShowcase(await response.json());
  } catch {
    return null;
  }
}
