"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { companySegmentOptions } from "@/features/onboarding/domain/profile-segments";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import type { CompanyCarouselQueryFilters } from "../api/company-carousel.api";
import { COMPANY_CAROUSEL_DEFAULT_LIMIT } from "../types/company-carousel.types";
import { useCompanyCarousel } from "../hooks/use-company-carousel";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
import { CompanyCarouselView } from "./company-carousel";

function CompanySegmentFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentSegment = searchParams.get("segment") ?? "";

  return (
    <SearchableSelect
      aria-label="Filtrar empresas por segmento"
      className="w-full rounded-xl sm:w-56"
      disabled={isPending}
      items={Object.fromEntries(companySegmentOptions)}
      onValueChange={(value) => {
        const nextParams = new URLSearchParams(searchParams.toString());

        if (value) {
          nextParams.set("segment", value);
        } else {
          nextParams.delete("segment");
        }

        startTransition(() => {
          const query = nextParams.toString();
          router.replace(query ? `${pathname}?${query}` : pathname);
        });
      }}
      placeholder="Todos os segmentos"
      value={currentSegment || null}
    />
  );
}

export function CompanyCarouselScreen({
  initialData,
  limit = COMPANY_CAROUSEL_DEFAULT_LIMIT,
}: {
  initialData?: CompanyCarouselViewResponseDto;
  limit?: number;
}) {
  return (
    <BrowserQueryProvider>
      <CompanyCarouselScreenContent initialData={initialData} limit={limit} />
    </BrowserQueryProvider>
  );
}

function CompanyCarouselScreenContent({
  initialData,
  limit,
}: {
  initialData?: CompanyCarouselViewResponseDto;
  limit: number;
}) {
  const searchParams = useSearchParams();
  const filters: CompanyCarouselQueryFilters = {
    search: searchParams.get("companySearch") ?? undefined,
    segment: searchParams.get("segment") ?? undefined,
  };
  const query = useCompanyCarousel(limit, initialData, filters);

  return (
    <section aria-labelledby="company-grid-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold tracking-[-0.02em]"
            id="company-grid-heading"
          >
            Empresas na comunidade
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Conheça as empresas cadastradas na Contente Creators e entre em
            contato para apresentar seu trabalho.
          </p>
        </div>
        <CompanySegmentFilter />
      </div>

      {query.isPending ? (
        <CompanyCarouselView response={null} status="loading" />
      ) : query.isError ? (
        <CompanyCarouselView
          onRetry={() => void query.refetch()}
          response={null}
          status="error"
        />
      ) : (
        <CompanyCarouselView response={query.data} status="success" />
      )}
    </section>
  );
}
