"use client";

import { AlertCircle, Building2, ExternalLink, RefreshCw } from "lucide-react";

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
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-36 min-w-56 rounded-2xl" />
          <Skeleton className="h-36 min-w-56 rounded-2xl" />
          <Skeleton className="h-36 min-w-56 rounded-2xl" />
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
      aria-roledescription="carrossel"
      className="space-y-4"
      role="region"
    >
      <div>
        <h2
          className="text-xl font-bold tracking-[-0.02em]"
          id="company-carousel-heading"
        >
          Empresas na comunidade
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Marcas aprovadas que também fazem parte da plataforma.
        </p>
      </div>
      <ul
        aria-label="Empresas aprovadas"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
      >
        {props.response.items.map((company) => (
          <li
            className="min-w-[min(16rem,82vw)] snap-start sm:min-w-64"
            key={`${company.displayName}-${company.logo.url}`}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="bg-muted flex h-20 items-center justify-center overflow-hidden rounded-xl p-3">
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
                </div>
                <CardTitle>{company.displayName}</CardTitle>
                <CardDescription>Empresa aprovada</CardDescription>
              </CardHeader>
              {company.websiteUrl ? (
                <CardContent>
                  <a
                    className="text-brand-blue inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
                    href={company.websiteUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" />
                    Visitar {company.displayName}
                  </a>
                </CardContent>
              ) : (
                <CardContent className="text-muted-foreground flex items-center gap-2">
                  <Building2 aria-hidden="true" />
                  Presença na plataforma
                </CardContent>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
