"use client";

import {
  AlertCircle,
  Building2,
  MapPin,
  RefreshCw,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/cn";

import { nameSizeClass } from "../lib/name-size";
import { staggerItemClassName } from "../lib/stagger";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";

type CompanyCarouselViewProps = {
  /** Search and segment controls, rendered under the heading they filter. */
  controls?: ReactNode;
  /**
   * Advertising rendered partway down the listing. Opaque on purpose: this
   * feature is not allowed to import the sponsorships feature, so the app
   * layer builds the node and passes it in.
   */
  midlistSlot?: ReactNode;
} & (
  | {
      onRetry?: never;
      response: CompanyCarouselViewResponseDto;
      status: "success";
    }
  | {
      onRetry?: never;
      response: null;
      status: "loading";
    }
  | {
      onRetry?: () => void;
      response: null;
      status: "error";
    }
);

function CompanyCarouselHeader({ controls }: { controls?: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-3xl font-extrabold tracking-[-0.035em]"
          id="company-carousel-heading"
        >
          Marcas para conhecer
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          Essas são as empresas cadastradas na Contente Creators. Conheça cada
          uma delas e fique à vontade para entrar em contato e apresentar seu
          trabalho. Queremos ser a sua conexão com novas oportunidades.
        </p>
      </div>
      {controls}
    </div>
  );
}

/**
 * The heading and controls render in every state on purpose: a search that
 * matches nothing must still leave the user a way to clear it.
 */
export function CompanyCarouselView(props: CompanyCarouselViewProps) {
  if (props.status === "loading") {
    return (
      <section
        aria-labelledby="company-carousel-heading"
        className="space-y-6"
        role="region"
      >
        <CompanyCarouselHeader controls={props.controls} />
        <div aria-live="polite" role="status">
          <span className="sr-only">Carregando empresas da comunidade</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (props.status === "error") {
    return (
      <section
        aria-labelledby="company-carousel-heading"
        className="space-y-6"
        role="region"
      >
        <CompanyCarouselHeader controls={props.controls} />
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Não foi possível carregar as empresas</AlertTitle>
          <AlertDescription>
            Tente novamente para confirmar seu acesso a esta área privada.
          </AlertDescription>
          <Button
            className="mt-3 min-h-11 w-fit"
            onClick={props.onRetry}
            type="button"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" />
            Tentar novamente
          </Button>
        </Alert>
      </section>
    );
  }

  if (props.response.items.length === 0) {
    return (
      <section
        aria-labelledby="company-carousel-heading"
        className="space-y-6"
        role="region"
      >
        <CompanyCarouselHeader controls={props.controls} />
        <p className="text-muted-foreground text-sm">
          Nenhuma empresa encontrada para esses filtros.
        </p>
      </section>
    );
  }

  /* Only break the listing when there is actually an ad to slot in, otherwise
   * the two grids would sit apart for no visible reason. */
  const splitForMidlist =
    Boolean(props.midlistSlot) &&
    props.response.items.length > COMPANIES_BEFORE_MIDLIST;
  const leadingCompanies = splitForMidlist
    ? props.response.items.slice(0, COMPANIES_BEFORE_MIDLIST)
    : props.response.items;
  const trailingCompanies = splitForMidlist
    ? props.response.items.slice(COMPANIES_BEFORE_MIDLIST)
    : [];

  return (
    <section
      aria-labelledby="company-carousel-heading"
      className="space-y-6"
      role="region"
    >
      <CompanyCarouselHeader controls={props.controls} />
      <CompanyGrid
        ariaLabel="Marcas cadastradas"
        companies={leadingCompanies}
      />
      {props.midlistSlot}
      {trailingCompanies.length > 0 ? (
        <CompanyGrid ariaLabel="Mais marcas" companies={trailingCompanies} />
      ) : null}
    </section>
  );
}

/** How many brands to show before breaking the listing with a wave of ads. */
const COMPANIES_BEFORE_MIDLIST = 8;

function CompanyGrid({
  ariaLabel,
  companies,
}: {
  ariaLabel: string;
  companies: readonly Company[];
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {companies.map((company, index) => (
        <li
          className={cn("min-w-0", staggerItemClassName(index))}
          data-testid="company-listing"
          key={`${company.displayName}-${company.email}`}
        >
          <Card
            className="hover:border-brand-blue/30 border-border gap-0 overflow-hidden rounded-2xl py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            role="article"
          >
            <div className="relative">
              <CompanyCover />
              <CompanyLogoAvatar company={company} />
            </div>

            <CardHeader className="gap-2.5 px-4 pt-9 pb-3">
              <CardTitle>
                <h3
                  className={cn(
                    "truncate font-extrabold tracking-[-0.01em]",
                    nameSizeClass(company.displayName),
                  )}
                >
                  {company.displayName}
                </h3>
              </CardTitle>
              {[company.city, company.state].filter(Boolean).length > 0 ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  {[company.city, company.state].filter(Boolean).join(", ")}
                </p>
              ) : null}
              {company.description ? (
                <p className="text-muted-foreground line-clamp-2 text-xs leading-5">
                  {company.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="bg-brand-night border-transparent text-[11px] text-white">
                  Empresa
                </Badge>
                {company.segment ? (
                  <Badge className="text-[11px]" variant="secondary">
                    {company.segment}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardFooter className="bg-card border-t-0 px-4 pt-0 pb-4">
              <Link
                aria-label={`Ver perfil de ${company.displayName}`}
                className={cn(
                  buttonVariants({
                    className:
                      "bg-brand-night hover:bg-brand-night/90 h-9 w-full text-sm text-white",
                    size: "sm",
                  }),
                )}
                href={`/app/companies/${company.companyId}`}
              >
                Ver perfil da marca
                <SquareArrowOutUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}

type Company = CompanyCarouselViewResponseDto["items"][number];

function CompanyCover() {
  return (
    <div
      aria-hidden="true"
      className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
    />
  );
}

function CompanyLogoAvatar({ company }: { company: Company }) {
  return (
    <div className="absolute -bottom-7 left-4 z-10 size-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
      {company.logo ? (
        // Signed bearer URLs must not enter the shared image cache.
        <SignedImage
          alt={company.logo.alt}
          className="size-full object-contain p-1.5"
          src={company.logo.url}
        />
      ) : (
        <div
          aria-label={`${company.displayName} está sem logo`}
          className="bg-muted text-muted-foreground flex size-full items-center justify-center"
          role="img"
        >
          <Building2 aria-hidden="true" className="size-6" />
        </div>
      )}
    </div>
  );
}
