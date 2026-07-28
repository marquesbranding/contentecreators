import { randomUUID } from "node:crypto";

import { dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";

import {
  ApprovedCatalogEntry,
  CompanyCarouselScreen,
  creatorCatalogKeys,
  CreatorCatalogView,
  creatorCatalogFiltersSchema,
  type CreatorCatalogBrowserPageDto,
} from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";
import {
  createCompanyCarouselViewService,
  createServerCompanyCarouselService,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import { FeatureHydrationBoundary } from "@/shared/query/feature-hydration-boundary";
import { getServerQueryClient } from "@/shared/server/query-client";

import { loadServerCreatorCatalogPage } from "@/app/_server/creator-catalog-page.loader";

export const metadata: Metadata = {
  title: "Catálogo",
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseCatalogPageFilters(
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  const singleValueEntries = Object.entries(rawSearchParams).flatMap(
    ([key, value]) => {
      const selected = Array.isArray(value) ? value[0] : value;

      return selected === undefined ? [] : [[key, selected] as const];
    },
  );
  const result = creatorCatalogFiltersSchema.safeParse(
    Object.fromEntries(singleValueEntries),
  );

  return result.success ? result.data : creatorCatalogFiltersSchema.parse({});
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const filters = parseCatalogPageFilters(await searchParams);

  return (
    <AccountStatusBoundary
      renderApproved={async (account) => {
        const queryClient = getServerQueryClient();
        const requestId = `catalog-page-${randomUUID()}`;

        const companyCarouselPromise =
          account.role === "INFLUENCER"
            ? (async () => {
                const service = await createServerCompanyCarouselService();
                const viewService = createCompanyCarouselViewService({
                  getSignedMedia: getServerSignedMedia,
                  listCompanies: service.list,
                });

                return viewService.list({}, `company-carousel-${randomUUID()}`);
              })()
            : Promise.resolve(undefined);
        const [, companyCarousel] = await Promise.all([
          queryClient.prefetchInfiniteQuery({
            getNextPageParam: (lastPage: CreatorCatalogBrowserPageDto) =>
              lastPage.nextCursor ?? undefined,
            initialPageParam: filters.cursor ?? null,
            queryFn: ({ pageParam }) =>
              loadServerCreatorCatalogPage(
                {
                  ...filters,
                  cursor: pageParam ?? undefined,
                },
                requestId,
              ),
            queryKey: creatorCatalogKeys.list(filters),
          }),
          companyCarouselPromise,
        ]);

        return (
          <ApprovedCatalogEntry showProfileLink signOutAction={signOutAction}>
            {companyCarousel ? (
              <div className="mb-8">
                <CompanyCarouselScreen initialData={companyCarousel} />
              </div>
            ) : null}
            <FeatureHydrationBoundary state={dehydrate(queryClient)}>
              <CreatorCatalogView />
            </FeatureHydrationBoundary>
          </ApprovedCatalogEntry>
        );
      }}
    />
  );
}
