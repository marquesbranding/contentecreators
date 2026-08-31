import { randomUUID } from "node:crypto";

import { dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ApprovedCatalogEntry,
  CatalogTipsPanel,
  CompanyCarouselScreen,
  creatorCatalogKeys,
  creatorCatalogFiltersSchema,
  HydratedCreatorCatalog,
  type CreatorCatalogBrowserPageDto,
} from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";
import {
  createCompanyCarouselViewService,
  createServerCompanyCarouselService,
} from "@/features/catalog/server";
import { getServerSignedMedia } from "@/features/media/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import { getServerQueryClient } from "@/shared/server/query-client";

import { CatalogSponsorshipSlots } from "@/app/_components/catalog-sponsorship-slots";
import { loadServerCatalogSponsorshipSlots } from "@/app/_server/catalog-sponsorship-slots.loader";
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
        if (account.role !== "COMPANY" && account.role !== "INFLUENCER") {
          redirect("/backoffice");
        }

        const queryClient = getServerQueryClient();
        const requestId = `catalog-page-${randomUUID()}`;

        if (account.role === "INFLUENCER") {
          const [companyCarousel, sponsorshipSlots] = await Promise.all([
            (async () => {
              const service = await createServerCompanyCarouselService();
              const viewService = createCompanyCarouselViewService({
                getSignedMedia: getServerSignedMedia,
                listCompanies: service.list,
              });

              return viewService.list({}, `company-carousel-${randomUUID()}`);
            })(),
            loadServerCatalogSponsorshipSlots(account.role),
          ]);

          return (
            <ApprovedCatalogEntry
              signOutAction={signOutAction}
              viewerRole={account.role}
            >
              <CatalogSponsorshipSlots slots={sponsorshipSlots}>
                <div className="mb-8 space-y-8">
                  <CompanyCarouselScreen initialData={companyCarousel} />
                  <CatalogTipsPanel />
                </div>
              </CatalogSponsorshipSlots>
            </ApprovedCatalogEntry>
          );
        }

        const [, sponsorshipSlots] = await Promise.all([
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
          loadServerCatalogSponsorshipSlots(account.role),
        ]);

        return (
          <ApprovedCatalogEntry
            signOutAction={signOutAction}
            viewerRole={account.role}
          >
            <CatalogSponsorshipSlots slots={sponsorshipSlots}>
              <HydratedCreatorCatalog
                state={dehydrate(queryClient)}
                viewerRole={account.role}
              />
            </CatalogSponsorshipSlots>
          </ApprovedCatalogEntry>
        );
      }}
    />
  );
}
