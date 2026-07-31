import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { niches } from "@/db/schema";

import {
  customNicheSlug,
  isCustomNicheSlug,
  OTHER_NICHE_SLUG,
} from "../../domain/profile-segments";

export interface CreatorNicheSelectionRow {
  id: string;
  name: string;
  slug: string;
}

export function mapCreatorNicheSelection(rows: CreatorNicheSelectionRow[]) {
  const customNiche = rows.find((niche) => isCustomNicheSlug(niche.slug));

  return {
    nicheSlugs: [
      ...rows
        .filter((niche) => !isCustomNicheSlug(niche.slug))
        .map((niche) => niche.slug),
      ...(customNiche ? [OTHER_NICHE_SLUG] : []),
    ],
    otherNiche: customNiche?.name,
  };
}

export async function resolveCreatorNiches(
  transaction: ApplicationTransaction,
  requestedSlugs: string[],
  otherNiche?: string,
) {
  const predefinedSlugs = [
    ...new Set(requestedSlugs.filter((slug) => slug !== OTHER_NICHE_SLUG)),
  ];
  const availableNiches =
    predefinedSlugs.length === 0
      ? []
      : await transaction
          .select({ id: niches.id, name: niches.name, slug: niches.slug })
          .from(niches)
          .where(
            and(
              inArray(niches.slug, predefinedSlugs),
              eq(niches.isActive, true),
            ),
          );

  if (availableNiches.length !== predefinedSlugs.length) {
    throw new Error("One or more selected niches are unavailable.");
  }

  if (!requestedSlugs.includes(OTHER_NICHE_SLUG)) {
    return availableNiches;
  }

  if (!otherNiche?.trim()) {
    throw new Error("The custom creator niche is required.");
  }

  const customName = otherNiche.trim();
  const slug = customNicheSlug(customName);
  const [customNiche] = await transaction
    .insert(niches)
    .values({
      isActive: true,
      name: customName,
      slug,
      sortOrder: 1_000,
    })
    .onConflictDoUpdate({
      set: {
        isActive: true,
        name: customName,
        updatedAt: new Date(),
      },
      target: niches.slug,
    })
    .returning({ id: niches.id, name: niches.name, slug: niches.slug });

  if (!customNiche) {
    throw new Error("The custom creator niche could not be saved.");
  }

  return [...availableNiches, customNiche];
}
