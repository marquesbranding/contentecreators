import { randomUUID } from "node:crypto";

import { dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ApprovedCatalogEntry,
  CatalogTipsPanel,
  directoryFiltersSchema,
  directoryKeys,
  HydratedDirectory,
  type DirectoryBrowserPageDto,
  type DirectoryFilters,
} from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import { getServerQueryClient } from "@/shared/server/query-client";

import {
  buildCatalogMidlistSlots,
  CatalogSponsorshipSlots,
} from "@/app/_components/catalog-sponsorship-slots";
import { loadServerCatalogDirectoryPage } from "@/app/_server/catalog-directory-page.loader";
import { loadServerCatalogSponsorshipSlots } from "@/app/_server/catalog-sponsorship-slots.loader";

export const metadata: Metadata = {
  title: "Catálogo",
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseCatalogPageFilters(
  rawSearchParams: Record<string, string | string[] | undefined>,
): DirectoryFilters {
  const entries: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (value === undefined) {
      continue;
    }

    entries[key] =
      key === "type"
        ? Array.isArray(value)
          ? value
          : [value]
        : Array.isArray(value)
          ? (value[0] ?? "")
          : value;
  }

  const result = directoryFiltersSchema.safeParse(entries);

  return result.success ? result.data : directoryFiltersSchema.parse({});
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
        const requestId = `catalog-directory-${randomUUID()}`;

        const [, sponsorshipSlots] = await Promise.all([
          queryClient.prefetchInfiniteQuery({
            getNextPageParam: (lastPage: DirectoryBrowserPageDto) =>
              lastPage.nextCursor ?? undefined,
            initialPageParam: filters.cursor ?? null,
            queryFn: ({ pageParam }) =>
              loadServerCatalogDirectoryPage(
                {
                  ...filters,
                  cursor: pageParam ?? undefined,
                },
                requestId,
              ),
            queryKey: directoryKeys.list(filters),
          }),
          loadServerCatalogSponsorshipSlots(account.role),
        ]);

        return (
          <ApprovedCatalogEntry
            signOutAction={signOutAction}
            viewerRole={account.role}
          >
            <CatalogSponsorshipSlots slots={sponsorshipSlots}>
              <div className="mb-8 space-y-8">
                <HydratedDirectory
                  midlistSlots={buildCatalogMidlistSlots(sponsorshipSlots)}
                  state={dehydrate(queryClient)}
                />
                {account.role === "INFLUENCER" ? <CatalogTipsPanel /> : null}
              </div>
            </CatalogSponsorshipSlots>
          </ApprovedCatalogEntry>
        );
      }}
    />
  );
}
