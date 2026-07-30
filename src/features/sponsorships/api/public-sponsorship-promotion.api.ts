import type { RendererPlacementDto } from "../types/sponsorship-placement.types";

const allowedPromotionKeys = new Set([
  "body",
  "eligible",
  "featuredCreator",
  "id",
  "linkLabel",
  "linkUrl",
  "media",
  "sortOrder",
  "title",
  "type",
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function parsePublicSponsorshipPromotion(
  value: unknown,
): RendererPlacementDto | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowedPromotionKeys.has(key))
  ) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const media = input.media;

  if (
    input.eligible !== true ||
    input.type !== "TOP_BANNER" ||
    (input.featuredCreator !== undefined && input.featuredCreator !== null) ||
    typeof input.id !== "string" ||
    !uuidPattern.test(input.id) ||
    !isNullableString(input.body) ||
    !isNullableString(input.linkLabel) ||
    !(
      input.linkUrl === null ||
      (input.linkUrl !== undefined && isSafeHttpUrl(input.linkUrl))
    ) ||
    !Number.isSafeInteger(input.sortOrder) ||
    typeof input.title !== "string" ||
    input.title.trim().length === 0 ||
    typeof media !== "object" ||
    media === null ||
    Array.isArray(media)
  ) {
    return null;
  }

  const mediaInput = media as Record<string, unknown>;

  if (
    Object.keys(mediaInput).some((key) => key !== "alt" && key !== "url") ||
    typeof mediaInput.alt !== "string" ||
    mediaInput.alt.trim().length === 0 ||
    !isSafeHttpUrl(mediaInput.url)
  ) {
    return null;
  }

  return {
    body: input.body,
    eligible: true,
    featuredCreator: null,
    id: input.id,
    linkLabel: input.linkLabel,
    linkUrl: input.linkUrl ?? null,
    media: {
      alt: mediaInput.alt,
      url: mediaInput.url,
    },
    sortOrder: input.sortOrder as number,
    title: input.title,
    type: "TOP_BANNER",
  };
}

type PublicRequest = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "json" | "ok">>;

export async function fetchPublicSponsorshipPromotion(
  signal: AbortSignal,
  request: PublicRequest = fetch,
): Promise<RendererPlacementDto | null> {
  try {
    const response = await request("/api/public/sponsorships/landing", {
      credentials: "omit",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return parsePublicSponsorshipPromotion(await response.json());
  } catch {
    return null;
  }
}
