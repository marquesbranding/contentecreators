import {
  AlertCircle,
  ArrowLeft,
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
import { SignedImage } from "@/shared/components/signed-image";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { formatNumber } from "@/shared/lib/formatting/formatters";

import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";
import { ContactIconRow, type ContactIconChannel } from "./contact-icon-row";

type CatalogDetailViewProps =
  | {
      detail: CatalogCreatorDetailViewDto | null;
      onRetry?: never;
      onWhatsappClick?: () => void;
      status: "success";
    }
  | {
      detail: null;
      onRetry?: never;
      onWhatsappClick?: never;
      status: "loading";
    }
  | {
      detail: null;
      onRetry?: () => void;
      onWhatsappClick?: never;
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

export function DetailLoading() {
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
          Voltar
        </Link>
      </Alert>
    </main>
  );
}

function contactUnavailableMessage(
  reason: Extract<
    CatalogCreatorDetailViewDto["contact"],
    { status: "UNAVAILABLE" }
  >["reason"],
) {
  return {
    CONSENT_NOT_GRANTED:
      "Este creator ainda não habilitou o compartilhamento de contatos.",
    NO_CONTACT_CHANNELS:
      "Este creator não possui canais de contato disponíveis no momento.",
    VIEWER_NOT_COMPANY:
      "Os contatos ficam disponíveis somente para empresas aprovadas.",
  }[reason];
}

function ContactSection({
  contact,
  displayName,
  onWhatsappClick,
}: {
  contact: CatalogCreatorDetailViewDto["contact"];
  displayName: string;
  onWhatsappClick: () => void;
}) {
  if (contact.status === "UNAVAILABLE") {
    return (
      <p className="text-muted-foreground text-sm">
        {contactUnavailableMessage(contact.reason)}
      </p>
    );
  }

  const channels: ContactIconChannel[] = [
    ...(contact.whatsapp
      ? [
          {
            href: contact.whatsapp.href,
            icon: "whatsapp" as const,
            label: `Chamar ${displayName} no WhatsApp`,
            onClick: onWhatsappClick,
          },
        ]
      : []),
    ...(contact.email
      ? [
          {
            href: contact.email.href,
            icon: "email" as const,
            label: `Enviar e-mail para ${displayName}`,
          },
        ]
      : []),
    ...contact.social.map((social) => ({
      href: social.href,
      icon: social.platform,
      label: `Abrir ${socialLabels[social.platform]} de ${displayName}`,
    })),
  ];

  return <ContactIconRow channels={channels} />;
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
    detail.metrics.find((metric) => metric.isPrimary) ??
    detail.metrics[0] ??
    null;
  const primaryHandle =
    detail.socialProfiles.find(
      (social) => social.platform === primaryMetric?.platform,
    )?.handle ?? null;
  const instagramMetric =
    detail.metrics.find((metric) => metric.platform === "INSTAGRAM") ?? null;
  const socialNetworks = [...detail.socialProfiles]
    .map((social) => ({
      ...social,
      metric:
        detail.metrics.find((metric) => metric.platform === social.platform) ??
        null,
    }))
    .sort(
      (left, right) =>
        Number(right.metric?.isPrimary) - Number(left.metric?.isPrimary),
    );

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
              <div className="absolute -top-10 left-5 size-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg sm:-top-12 sm:left-8 sm:size-24">
                {detail.media.avatar ? (
                  <SignedImage
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
                  {accountTypeLabels[detail.creatorType]}
                </Badge>
                {detail.niches.map((niche) => (
                  <Badge
                    className="bg-brand-night border-transparent text-white"
                    key={niche.slug}
                  >
                    {niche.name}
                  </Badge>
                ))}
                {detail.whatsappContactCount > 0 ? (
                  <Badge className="gap-1.5 border-transparent bg-[#25D366] text-white">
                    <WhatsAppIcon className="size-3" />
                    {detail.whatsappContactCount}{" "}
                    {detail.whatsappContactCount === 1
                      ? "empresa chamou"
                      : "empresas chamaram"}{" "}
                    no WhatsApp
                  </Badge>
                ) : null}
              </div>
              <ContactSection
                contact={detail.contact}
                displayName={detail.displayName}
                onWhatsappClick={() => {
                  props.onWhatsappClick?.();
                }}
              />
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

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Sobre o creator</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7 whitespace-pre-line">{detail.bio}</p>
            </CardContent>
          </Card>

          {socialNetworks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Redes sociais</h2>
                </CardTitle>
                <CardDescription>
                  Métricas autodeclaradas pelo creator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {socialNetworks.map((social) => (
                    <li
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        social.metric?.isPrimary
                          ? "border-brand-blue bg-brand-blue-soft"
                          : "border-border"
                      }`}
                      key={social.platform}
                    >
                      <SocialPlatformIcon
                        className="size-6 shrink-0"
                        platform={social.platform}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                          {social.handle ?? socialLabels[social.platform]}
                          {social.metric?.isPrimary ? (
                            <Badge className="text-[10px]" variant="outline">
                              Principal
                            </Badge>
                          ) : null}
                        </p>
                        {social.metric?.followerCount !== undefined &&
                        social.metric?.followerCount !== null ? (
                          <p className="text-muted-foreground text-xs">
                            {formatNumber(social.metric.followerCount)}{" "}
                            seguidores
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {instagramMetric ? (
            <Card className="from-brand-blue/5 bg-gradient-to-br to-transparent">
              <CardHeader>
                <CardTitle>
                  <h2>Painel do Instagram</h2>
                </CardTitle>
                <CardDescription>Métricas autodeclaradas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Seguidores",
                      value: instagramMetric.followerCount,
                    },
                    {
                      label: "Visualizações",
                      value: instagramMetric.viewCount,
                    },
                    {
                      label: "Interações",
                      value: instagramMetric.interactionCount,
                    },
                    {
                      label: "Novos seguidores",
                      value: instagramMetric.newFollowerCount,
                    },
                  ]
                    .filter(({ value }) => value !== null)
                    .map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-muted-foreground text-xs">
                          {label}
                        </dt>
                        <dd className="text-2xl font-extrabold tracking-[-0.02em]">
                          {formatNumber(value as number)}
                        </dd>
                      </div>
                    ))}
                </dl>
                {instagramMetric.sharedContentDescription ? (
                  <p className="text-muted-foreground text-sm leading-6">
                    <span className="text-foreground font-semibold">
                      Conteúdo que compartilha:
                    </span>{" "}
                    {instagramMetric.sharedContentDescription}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </article>
      </div>
    </main>
  );
}
