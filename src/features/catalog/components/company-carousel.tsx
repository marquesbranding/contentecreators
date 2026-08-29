"use client";

import {
  AlertCircle,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";

type CompanyCarouselViewProps =
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
    };

export function CompanyCarouselView(props: CompanyCarouselViewProps) {
  if (props.status === "loading") {
    return (
      <section
        aria-label="Empresas na comunidade"
        aria-live="polite"
        className="space-y-4"
        role="status"
      >
        <span className="sr-only">Carregando empresas da comunidade</span>
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (props.status === "error") {
    return (
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
    );
  }

  if (props.response.items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma empresa encontrada para esses filtros.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="company-carousel-heading"
      className="space-y-6"
      role="region"
    >
      <div>
        <h2
          className="text-3xl font-extrabold tracking-[-0.035em]"
          id="company-carousel-heading"
        >
          Marcas para conhecer
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          Essas são as empresas cadastradas na Contente Creators. Conheça
          cada uma delas e fique à vontade para entrar em contato e
          apresentar seu trabalho. Queremos ser a sua conexão com novas
          oportunidades.
        </p>
      </div>
      <ul
        aria-label="Empresas aprovadas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {props.response.items.map((company) => (
          <li
            className="min-w-0"
            data-testid="company-listing"
            key={`${company.displayName}-${company.email}`}
          >
            <Card className="bg-brand-night-surface h-full gap-0 overflow-hidden rounded-2xl border-white/10 py-0 text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20">
              <div className="from-brand-blue/35 to-brand-night flex aspect-[16/9] items-center justify-center border-b border-white/10 bg-gradient-to-br">
                {company.logo ? (
                  <>
                    {/* Signed bearer URLs must not enter the shared image cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={company.logo.alt}
                      className="max-h-24 max-w-[70%] object-contain sm:max-h-28"
                      decoding="async"
                      height={company.logo.height ?? 320}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      src={company.logo.url}
                      width={company.logo.width ?? 640}
                    />
                  </>
                ) : (
                  <span
                    aria-label={`${company.displayName} está sem logo`}
                    className="text-brand-blue flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                    role="img"
                  >
                    <Building2 aria-hidden="true" className="size-8" />
                  </span>
                )}
              </div>

              <CardHeader className="gap-3 px-5 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="bg-brand-blue/30 border-transparent text-white"
                    variant="ghost"
                  >
                    Empresa
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <CardTitle>
                    <h3 className="text-xl font-bold tracking-[-0.02em] break-words">
                      {company.displayName}
                    </h3>
                  </CardTitle>
                  {company.segment ? (
                    <p className="line-clamp-2 text-sm leading-5 text-white/55">
                      {company.segment}
                    </p>
                  ) : null}
                  {[company.city, company.state].filter(Boolean).length > 0 ? (
                    <p className="flex items-center gap-1.5 text-sm text-white/55">
                      <MapPin aria-hidden="true" className="size-4 shrink-0" />
                      {[company.city, company.state].filter(Boolean).join(", ")}
                    </p>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4 px-5 py-4">
                {company.description ? (
                  <p className="line-clamp-3 leading-6 break-words text-white/60">
                    {company.description}
                  </p>
                ) : null}

                <CompanyContactLinks company={company} />
              </CardContent>

              <CardFooter className="border-t border-white/10 bg-transparent px-5 py-4">
                <a
                  aria-label={`Conhecer marca ${company.displayName}`}
                  className={buttonVariants({
                    className: "w-full",
                    size: "lg",
                  })}
                  href={`/app/companies/${company.companyId}`}
                >
                  <ShieldCheck aria-hidden="true" />
                  Conhecer marca
                  <ExternalLink aria-hidden="true" />
                </a>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Company = CompanyCarouselViewResponseDto["items"][number];

function CompanyContactLinks({ company }: { company: Company }) {
  return (
    <div className="mt-auto rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/50">
        <ShieldCheck aria-hidden="true" className="size-4" />
        Contato liberado
      </p>
      <div className="flex flex-wrap gap-2">
        {company.whatsappE164 ? (
          <a
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
            href={`https://wa.me/${company.whatsappE164.replace(/\D/gu, "")}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            WhatsApp
          </a>
        ) : null}
        <a
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
          href={`mailto:${company.email}`}
        >
          E-mail
        </a>
        {company.websiteUrl ? (
          <a
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
            href={company.websiteUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Site
          </a>
        ) : null}
      </div>
    </div>
  );
}
