"use client";

import {
  AlertCircle,
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    return null;
  }

  return (
    <section
      aria-labelledby="company-carousel-heading"
      className="space-y-6"
      role="region"
    >
      <div>
        <p className="text-brand-blue text-sm font-extrabold tracking-[0.12em] uppercase">
          Empresas aprovadas
        </p>
        <h2
          className="mt-2 text-3xl font-extrabold tracking-[-0.035em]"
          id="company-carousel-heading"
        >
          Marcas para conhecer
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          Empresas cadastradas na Contente Creators. Entre em contato para
          apresentar seu trabalho e abrir novas oportunidades.
        </p>
      </div>
      <ul
        aria-label="Empresas aprovadas"
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {props.response.items.map((company) => (
          <li
            data-testid="company-listing"
            key={`${company.displayName}-${company.email}`}
          >
            <Card className="h-full overflow-hidden rounded-2xl">
              <CardHeader>
                <div className="bg-muted flex h-24 items-center justify-center overflow-hidden rounded-xl p-3">
                  {company.logo ? (
                    <>
                      {/* Signed bearer URLs must not enter the shared image cache. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={company.logo.alt}
                        className="max-h-full max-w-full object-contain"
                        decoding="async"
                        height={company.logo.height ?? 320}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        src={company.logo.url}
                        width={company.logo.width ?? 640}
                      />
                    </>
                  ) : (
                    <Building2
                      aria-label={`${company.displayName} está sem logo`}
                      className="text-muted-foreground size-10"
                    />
                  )}
                </div>
                <CardTitle>{company.displayName}</CardTitle>
                <CardDescription className="space-y-1">
                  <span className="block">
                    {company.segment ?? "Empresa aprovada"}
                  </span>
                  {[company.city, company.state].filter(Boolean).length > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-4" />
                      {[company.city, company.state].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {company.description ? (
                  <p className="text-muted-foreground line-clamp-3 leading-6">
                    {company.description}
                  </p>
                ) : null}

                <div className="mt-auto grid gap-2">
                  {company.whatsappE164 ? (
                    <a
                      className="bg-brand-blue inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
                      href={`https://wa.me/${company.whatsappE164.replace(/\D/gu, "")}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <MessageCircle aria-hidden="true" />
                      Chamar no WhatsApp
                    </a>
                  ) : null}
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2 font-semibold transition-colors hover:bg-black/[0.08] focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
                    href={`mailto:${company.email}`}
                  >
                    <Mail aria-hidden="true" />
                    Enviar e-mail
                  </a>
                  {company.websiteUrl ? (
                    <a
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2 font-semibold transition-colors hover:bg-black/[0.08] focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
                      href={company.websiteUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden="true" />
                      Abrir site
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
