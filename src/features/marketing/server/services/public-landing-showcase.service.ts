import "server-only";

import type {
  PublicLandingShowcaseDto,
  PublicLandingShowcaseSource,
  PublicShowcaseCompanyDto,
  PublicShowcaseCreatorDto,
  PublicShowcaseImageDto,
  PublicShowcaseImageSource,
  PublicShowcaseItemDto,
} from "../../types/public-landing-showcase.types";

interface PublicLandingShowcaseServiceDependencies {
  loadShowcase(): Promise<PublicLandingShowcaseSource>;
  /**
   * Turns private storage coordinates into a short-lived public URL. Omitted,
   * returning `null` or throwing leaves that card on its fallback mark, so a
   * storage outage never removes the carousel.
   */
  signImage?(
    source: PublicShowcaseImageSource,
  ): Promise<PublicShowcaseImageDto | null>;
}

/** Alternates creator, company, creator… so neither kind clusters. */
export function interleaveShowcase(
  creators: readonly PublicShowcaseCreatorDto[],
  companies: readonly PublicShowcaseCompanyDto[],
): PublicShowcaseItemDto[] {
  const items: PublicShowcaseItemDto[] = [];

  for (
    let index = 0;
    index < Math.max(creators.length, companies.length);
    index += 1
  ) {
    const creator = creators[index];
    const company = companies[index];

    if (creator) {
      items.push(creator);
    }

    if (company) {
      items.push(company);
    }
  }

  return items;
}

export function createPublicLandingShowcaseService({
  loadShowcase,
  signImage,
}: PublicLandingShowcaseServiceDependencies) {
  async function sign(source: PublicShowcaseImageSource | null) {
    if (!source || !signImage) {
      return null;
    }

    try {
      return await signImage(source);
    } catch {
      return null;
    }
  }

  return {
    async load(): Promise<PublicLandingShowcaseDto | null> {
      try {
        const source = await loadShowcase();
        const [creators, companies] = await Promise.all([
          Promise.all(
            source.creators.map(
              async ({ avatarSource, ...creator }) =>
                ({
                  ...creator,
                  avatar: await sign(avatarSource),
                  kind: "CREATOR",
                }) satisfies PublicShowcaseCreatorDto,
            ),
          ),
          Promise.all(
            source.companies.map(
              async ({ logoSource, ...company }) =>
                ({
                  ...company,
                  kind: "COMPANY",
                  logo: await sign(logoSource),
                }) satisfies PublicShowcaseCompanyDto,
            ),
          ),
        ]);

        /* An empty list is an answer ("nobody enabled yet"); `null` is
         * reserved for "could not load", which hides the carousel. */
        return { items: interleaveShowcase(creators, companies) };
      } catch {
        return null;
      }
    },
  };
}
