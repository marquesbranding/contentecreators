import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/formatting/formatters";

import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";

/** WhatsApp's own glyph, drawn in `currentColor` so it sits white on the WhatsApp-green button. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

type CatalogDetailViewProps =
  | {
      detail: CatalogCreatorDetailViewDto | null;
      onRetry?: never;
      status: "success";
    }
  | {
      detail: null;
      onRetry?: never;
      status: "loading";
    }
  | {
      detail: null;
      onRetry?: () => void;
      status: "error";
    };

const socialLabels = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  KWAI: "Kwai",
  LINKEDIN: "LinkedIn",
  OTHER: "Outra rede",
  TELEGRAM: "Telegram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
} as const;

function CatalogPrivateImage({
  alt,
  className,
  fetchPriority = "auto",
  height,
  loading = "lazy",
  src,
  width,
}: {
  alt: string;
  className: string;
  fetchPriority?: "auto" | "high" | "low";
  height: number | null;
  loading?: "eager" | "lazy";
  src: string;
  width: number | null;
}) {
  /* A short-lived bearer URL intentionally bypasses the shared image optimizer. */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={fetchPriority}
      height={height ?? 640}
      loading={loading}
      referrerPolicy="no-referrer"
      src={src}
      width={width ?? 640}
    />
  );
}

function DetailLoading() {
  return (
    <div
      aria-live="polite"
      className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8 sm:py-10"
      role="status"
    >
      <span className="sr-only">Carregando perfil do creator</span>
      <Skeleton className="h-12 w-44" />
      <Skeleton className="aspect-[16/7] w-full rounded-3xl" />
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

function DetailError({ onRetry }: { onRetry?: () => void }) {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-10 sm:px-8"
      id="main-content"
      tabIndex={-1}
    >
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Não foi possível carregar este perfil</AlertTitle>
        <AlertDescription>
          Verifique sua conexão e tente novamente. Nenhum dado anterior será
          exibido enquanto o acesso não for confirmado.
        </AlertDescription>
        <Button
          className="mt-4 min-h-11 w-fit"
          onClick={onRetry}
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      </Alert>
    </main>
  );
}

function DetailUnavailable() {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-10 sm:px-8"
      id="main-content"
      tabIndex={-1}
    >
      <Alert>
        <UsersRound aria-hidden="true" />
        <AlertTitle>
          <h1>Perfil não disponível</h1>
        </AlertTitle>
        <AlertDescription>
          Este creator não faz mais parte do catálogo elegível ou o endereço
          acessado não existe.
        </AlertDescription>
        <Link
          className={`${buttonVariants({ variant: "outline" })} mt-4 min-h-11`}
          href="/app/catalog"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar ao catálogo
        </Link>
      </Alert>
    </main>
  );
}

function ContactCard({
  contact,
}: {
  contact: CatalogCreatorDetailViewDto["contact"];
}) {
  if (contact.status === "UNAVAILABLE") {
    const message = {
      CONSENT_NOT_GRANTED:
        "Este creator ainda não habilitou o compartilhamento de contatos.",
      NO_CONTACT_CHANNELS:
        "Este creator não possui canais de contato disponíveis no momento.",
      VIEWER_NOT_COMPANY:
        "Os contatos ficam disponíveis somente para empresas aprovadas.",
    }[contact.reason];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Entre em contato</CardTitle>
        <CardDescription>
          Canais liberados pelo creator para empresas aprovadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {contact.whatsapp ? (
          <a
            className={cn(
              buttonVariants({
                className: "bg-[#25D366] text-white hover:bg-[#1fb95a]",
              }),
            )}
            href={contact.whatsapp.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsAppIcon className="size-4" />
            Chamar no WhatsApp
          </a>
        ) : null}
        {contact.email ? (
          <a
            className={buttonVariants({ variant: "outline" })}
            href={contact.email.href}
          >
            <Mail aria-hidden="true" />
            Enviar e-mail
          </a>
        ) : null}
        {contact.social.map((social) => (
          <a
            className={buttonVariants({ variant: "outline" })}
            href={social.href}
            key={`${social.platform}-${social.href}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
            Abrir {socialLabels[social.platform]}
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function CatalogDetailView(props: CatalogDetailViewProps) {
  if (props.status === "loading") {
    return <DetailLoading />;
  }

  if (props.status === "error") {
    return <DetailError onRetry={props.onRetry} />;
  }

  if (!props.detail) {
    return <DetailUnavailable />;
  }

  const { detail } = props;
  const primaryMetric =
    detail.metrics.find((metric) => metric.isPrimary) ?? detail.metrics[0] ?? null;
  const primaryHandle =
    detail.socialProfiles.find(
      (social) => social.platform === primaryMetric?.platform,
    )?.handle ?? null;

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
          Voltar ao catálogo
        </Link>

        <article className="mt-5 space-y-5">
          <Card className="gap-0 overflow-hidden rounded-3xl py-0">
            {detail.media.cover ? (
              <CatalogPrivateImage
                alt={detail.media.cover.alt}
                className="h-36 w-full object-cover sm:h-44 lg:h-52"
                fetchPriority="high"
                height={detail.media.cover.height}
                loading="eager"
                src={detail.media.cover.url}
                width={detail.media.cover.width}
              />
            ) : (
              <div
                aria-hidden="true"
                className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 h-36 bg-gradient-to-br sm:h-44 lg:h-52"
              />
            )}
            <CardHeader className="relative gap-4 px-5 pt-14 pb-6 sm:px-8 sm:pt-16">
              <div className="absolute -top-10 left-5 size-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg sm:-top-12 sm:left-8 sm:size-24">
                {detail.media.avatar ? (
                  <CatalogPrivateImage
                    alt={detail.media.avatar.alt}
                    className="size-full object-cover"
                    height={detail.media.avatar.height}
                    src={detail.media.avatar.url}
                    width={detail.media.avatar.width}
                  />
                ) : (
                  <div className="bg-muted flex size-full items-center justify-center">
                    <UsersRound
                      aria-hidden="true"
                      className="text-muted-foreground size-10"
                    />
                  </div>
                )}
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                <h1>{detail.displayName}</h1>
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-brand-night border-transparent text-white">
                  {detail.creatorType === "UGC"
                    ? "Creator UGC"
                    : "Influenciador"}
                </Badge>
                {detail.niches.map((niche) => (
                  <Badge
                    className="bg-brand-night border-transparent text-white"
                    key={niche.slug}
                  >
                    {niche.name}
                  </Badge>
                ))}
              </div>
              <CardDescription className="flex items-center gap-2 text-base">
                <MapPin aria-hidden="true" className="size-4" />
                {detail.location.city}, {detail.location.state}
              </CardDescription>
              {primaryMetric ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <SocialPlatformIcon
                      className="size-4"
                      platform={primaryMetric.platform}
                    />
                    {primaryHandle ?? socialLabels[primaryMetric.platform]}
                  </span>
                  {primaryMetric.followerCount !== null ? (
                    <span className="text-muted-foreground">
                      {formatNumber(primaryMetric.followerCount)} seguidores
                    </span>
                  ) : null}
                  <Badge className="text-[11px]" variant="outline">
                    Métrica autodeclarada
                  </Badge>
                </div>
              ) : null}
            </CardHeader>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-stretch">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  <h2>Sobre o creator</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 whitespace-pre-line">{detail.bio}</p>
              </CardContent>
            </Card>
            <aside aria-label="Ações de contato">
              <ContactCard contact={detail.contact} />
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
