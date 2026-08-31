"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

import { companySegmentOptions } from "@/features/onboarding/domain/profile-segments";
import { Input } from "@/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
} from "@/shared/components/ui/input-group";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import type { CompanyCarouselQueryFilters } from "../api/company-carousel.api";
import { COMPANY_CAROUSEL_DEFAULT_LIMIT } from "../types/company-carousel.types";
import { useCompanyCarousel } from "../hooks/use-company-carousel";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
import { CompanyCarouselView } from "./company-carousel";

const SEARCH_DEBOUNCE_MS = 300;

function CompanyNameSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("companySearch") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <InputGroup className="w-full sm:w-72">
      <InputGroupAddon>
        <Search aria-hidden="true" className="text-muted-foreground size-4" />
      </InputGroupAddon>
      <Input
        aria-label="Buscar empresas por nome ou segmento"
        className="rounded-xl"
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams.toString());

            if (nextValue.trim()) {
              nextParams.set("companySearch", nextValue.trim());
            } else {
              nextParams.delete("companySearch");
            }

            startTransition(() => {
              const query = nextParams.toString();
              router.replace(query ? `${pathname}?${query}` : pathname);
            });
          }, SEARCH_DEBOUNCE_MS);
        }}
        placeholder="Buscar empresas por nome ou segmento"
        type="search"
        value={value}
      />
    </InputGroup>
  );
}

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
  midlistSlot,
}: {
  initialData?: CompanyCarouselViewResponseDto;
  limit?: number;
  midlistSlot?: ReactNode;
}) {
  return (
    <BrowserQueryProvider>
      <CompanyCarouselScreenContent
        initialData={initialData}
        limit={limit}
        midlistSlot={midlistSlot}
      />
    </BrowserQueryProvider>
  );
}

function CompanyCarouselScreenContent({
  initialData,
  limit,
  midlistSlot,
}: {
  initialData?: CompanyCarouselViewResponseDto;
  limit: number;
  midlistSlot?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const filters: CompanyCarouselQueryFilters = {
    search: searchParams.get("companySearch") ?? undefined,
    segment: searchParams.get("segment") ?? undefined,
  };
  const query = useCompanyCarousel(limit, initialData, filters);
  /* Handed to the view so the controls sit directly under the section heading
   * they filter, instead of floating above it. */
  const controls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <CompanyNameSearch />
      <CompanySegmentFilter />
    </div>
  );

  return (
    <section aria-labelledby="company-carousel-heading" className="space-y-4">
      {query.isPending ? (
        <CompanyCarouselView
          controls={controls}
          response={null}
          status="loading"
        />
      ) : query.isError ? (
        <CompanyCarouselView
          controls={controls}
          onRetry={() => void query.refetch()}
          response={null}
          status="error"
        />
      ) : (
        <CompanyCarouselView
          controls={controls}
          midlistSlot={midlistSlot}
          response={query.data}
          status="success"
        />
      )}
    </section>
  );
}
