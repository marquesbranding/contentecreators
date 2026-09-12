import type { PublicShowcaseItemDto } from "../types/public-landing-showcase.types";
import { PublicCommunityCompanyCard } from "./public-community-company-card";
import { PublicCommunityCreatorCard } from "./public-community-creator-card";

/**
 * One showcase entry, rendered the same way whether the row is rotating or
 * still, so the two layouts cannot drift apart.
 */
export function ShowcaseItemCard({ item }: { item: PublicShowcaseItemDto }) {
  return item.kind === "CREATOR" ? (
    <PublicCommunityCreatorCard creator={item} />
  ) : (
    <PublicCommunityCompanyCard company={item} />
  );
}

export function showcaseItemTestId(item: PublicShowcaseItemDto) {
  return item.kind === "CREATOR" ? "creator-listing" : "company-listing";
}

export function showcaseItemKey(item: PublicShowcaseItemDto) {
  return `${item.kind}-${item.id}`;
}
