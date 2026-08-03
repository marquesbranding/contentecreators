"use client";

import {
  AlertCircle,
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
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
            <Card className="bg-brand-night-surface h-full gap-0 overflow-hidden rounded-2xl border-white/10 py-0 text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20">
              <div className="from-brand-blue/35 to-brand-night flex aspect-[16/9] items-center justify-center border-b border-white/10 bg-gradient-to-br p-5">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/92 p-4">
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
                    <span
                      aria-label={`${company.displayName} está sem logo`}
                      className="text-brand-night/55 flex size-16 items-center justify-center rounded-2xl bg-black/5"
                      role="img"
                    >
                      <Building2 aria-hidden="true" className="size-8" />
                    </span>
                  )}
                </div>
              </div>

              <CardHeader className="gap-3 px-5 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="bg-brand-blue/30 border-transparent text-white"
                    variant="ghost"
                  >
                    Empresa
                  </Badge>
                  {company.segment ? (
                    <Badge
                      className="border-white/15 bg-white/5 text-white/70"
                      variant="outline"
                    >
                      {company.segment}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <CardTitle>
                    <h3 className="text-xl font-bold tracking-[-0.02em]">
                      {company.displayName}
                    </h3>
                  </CardTitle>
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
                  <p className="line-clamp-4 leading-6 text-white/60">
                    {company.description}
                  </p>
                ) : null}

                <div className="mt-auto rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Contato liberado para creators aprovados
                  </p>
                </div>
              </CardContent>

              <CardFooter className="grid gap-2 border-t border-white/10 bg-transparent px-5 py-4">
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/8 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/12 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
                  href={`mailto:${company.email}`}
                >
                  <Mail aria-hidden="true" />
                  Enviar e-mail
                </a>
                {company.websiteUrl ? (
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/8 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/12 focus-visible:ring-3 focus-visible:ring-blue-300 focus-visible:outline-none"
                    href={company.websiteUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" />
                    Abrir site
                  </a>
                ) : null}
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
