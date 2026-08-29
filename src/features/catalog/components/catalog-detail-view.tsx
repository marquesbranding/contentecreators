import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  Star,
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
import { formatNumber } from "@/shared/lib/formatting/formatters";

function formatMetricLine(
  value: number | null,
  unit: string,
  emptyLabel: string,
) {
  return value === null ? emptyLabel : `${formatNumber(value)} ${unit}`;
}

import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";

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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-96 rounded-3xl" />
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
    <Card>
      <CardHeader>
        <CardTitle>Entre em contato</CardTitle>
        <CardDescription>
          Canais liberados pelo creator para empresas aprovadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {contact.whatsapp ? (
          <a
            className={buttonVariants({ variant: "default" })}
            href={contact.whatsapp.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" />
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

function MetricCards({ detail }: { detail: CatalogCreatorDetailViewDto }) {
  if (detail.metrics.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="creator-metrics-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-xl font-bold tracking-[-0.02em]"
          id="creator-metrics-heading"
        >
          Alcance nas redes
        </h2>
        <Badge variant="outline">Métrica autodeclarada</Badge>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        Informações declaradas pelo próprio creator, sem verificação automática.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {detail.metrics.map((metric) => (
          <li key={`${metric.platform}-${metric.observedOn}`}>
            <Card
              className={
                metric.isPrimary ? "border-amber-400 ring-1 ring-amber-400/40" : undefined
              }
              size="sm"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  {socialLabels[metric.platform]}
                  {metric.isPrimary ? (
                    <Badge className="gap-1" variant="outline">
                      <Star aria-hidden="true" className="size-3 fill-amber-500 text-amber-500" />
                      Principal
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  Atualizado em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "UTC",
                  }).format(new Date(`${metric.observedOn}T00:00:00.000Z`))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-lg font-bold">
                  {formatMetricLine(
                    metric.followerCount,
                    "seguidores",
                    "Seguidores não informados",
                  )}
                </p>
                <p className="text-muted-foreground">
                  {formatMetricLine(
                    metric.viewCount,
                    "visualizações",
                    "Visualizações não informadas",
                  )}
                </p>
                <p className="text-muted-foreground">
                  {formatMetricLine(
                    metric.interactionCount,
                    "interações",
                    "Interações não informadas",
                  )}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
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
                <Badge>
                  {detail.creatorType === "UGC"
                    ? "Creator UGC"
                    : "Influenciador"}
                </Badge>
                {detail.niches.map((niche) => (
                  <Badge key={niche.slug} variant="secondary">
                    {niche.name}
                  </Badge>
                ))}
              </div>
              <CardDescription className="flex items-center gap-2 text-base">
                <MapPin aria-hidden="true" className="size-4" />
                {detail.location.city}, {detail.location.state}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Sobre o creator</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-7 whitespace-pre-line">{detail.bio}</p>
                  {detail.socialProfiles.length > 0 ? (
                    <div className="mt-5 border-t pt-5">
                      <h3 className="font-semibold">Presença nas redes</h3>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {detail.socialProfiles.map((social) => (
                          <li
                            key={`${social.platform}-${social.handle ?? "sem-handle"}`}
                          >
                            <Badge variant="outline">
                              <AtSign aria-hidden="true" />
                              {socialLabels[social.platform]}
                              {social.handle ? ` — ${social.handle}` : ""}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <MetricCards detail={detail} />
            </div>
            <aside aria-label="Ações de contato">
              <ContactCard contact={detail.contact} />
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
