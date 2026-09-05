import { ArrowLeft, Building2, MapPin } from "lucide-react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import type { CompanyDetailViewDto } from "../types/company-detail.types";
import { ContactIconRow, type ContactIconChannel } from "./contact-icon-row";

function CompanyUnavailable() {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-10 sm:px-8"
      id="main-content"
      tabIndex={-1}
    >
      <Alert>
        <Building2 aria-hidden="true" />
        <AlertTitle>
          <h1>Marca não disponível</h1>
        </AlertTitle>
        <AlertDescription>
          Esta empresa não faz mais parte do catálogo elegível ou o endereço
          acessado não existe.
        </AlertDescription>
        <Link
          className={`${buttonVariants({ variant: "outline" })} mt-4 min-h-11`}
          href="/app/catalog"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Link>
      </Alert>
    </main>
  );
}

function companyContactChannels(
  contact: CompanyDetailViewDto["contact"],
  displayName: string,
): ContactIconChannel[] {
  return [
    ...(contact.whatsapp
      ? [
          {
            href: contact.whatsapp.href,
            icon: "whatsapp" as const,
            label: `Chamar ${displayName} no WhatsApp`,
          },
        ]
      : []),
    {
      href: contact.email.href,
      icon: "email" as const,
      label: `Enviar e-mail para ${displayName}`,
    },
    ...(contact.site
      ? [
          {
            href: contact.site.href,
            icon: "site" as const,
            label: `Abrir site de ${displayName}`,
          },
        ]
      : []),
  ];
}

export function CompanyDetailView({
  detail,
}: {
  detail: CompanyDetailViewDto | null;
}) {
  if (!detail) {
    return <CompanyUnavailable />;
  }

  return (
    <main
      className="bg-brand-canvas min-h-screen"
      id="main-content"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/app/catalog"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </Link>

        <article className="mt-5 space-y-5">
          <Card className="gap-0 overflow-hidden rounded-3xl py-0">
            {detail.media.cover ? (
              <SignedImage
                alt={detail.media.cover.alt}
                className="object-cover"
                fetchPriority="high"
                height={detail.media.cover.height}
                loading="eager"
                src={detail.media.cover.url}
                width={detail.media.cover.width}
                wrapperClassName="h-36 w-full sm:h-44 lg:h-52"
              />
            ) : (
              <div
                aria-hidden="true"
                className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 h-36 bg-gradient-to-br sm:h-44 lg:h-52"
              />
            )}
            <CardHeader className="relative gap-4 px-5 pt-14 pb-6 sm:px-8 sm:pt-16">
              <div className="absolute -top-10 left-5 flex size-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg sm:-top-12 sm:left-8 sm:size-24">
                {detail.media.logo ? (
                  <SignedImage
                    alt={detail.media.logo.alt}
                    className="max-h-[70%] max-w-[78%] object-contain"
                    height={detail.media.logo.height}
                    src={detail.media.logo.url}
                    width={detail.media.logo.width}
                  />
                ) : (
                  <Building2
                    aria-hidden="true"
                    className="text-muted-foreground size-10"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Empresa</Badge>
                {detail.segment ? (
                  <Badge className="whitespace-normal" variant="secondary">
                    {detail.segment}
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                <h1>{detail.displayName}</h1>
              </CardTitle>
              <ContactIconRow
                channels={companyContactChannels(
                  detail.contact,
                  detail.displayName,
                )}
              />
              {detail.location ? (
                <CardDescription className="flex items-center gap-2 text-base">
                  <MapPin aria-hidden="true" className="size-4" />
                  {detail.location.city}, {detail.location.state}
                </CardDescription>
              ) : null}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Sobre a marca</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detail.description ? (
                <p className="leading-7 whitespace-pre-line">
                  {detail.description}
                </p>
              ) : (
                <p className="text-muted-foreground leading-7">
                  Esta marca ainda não adicionou uma descrição pública.
                </p>
              )}
            </CardContent>
          </Card>
        </article>
      </div>
    </main>
  );
}
