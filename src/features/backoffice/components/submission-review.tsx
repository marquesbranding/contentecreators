import {
  BadgeCheck,
  Building2,
  CalendarClock,
  FileCheck2,
  ImageIcon,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/shared/components/ui/progress";
import {
  formatCnpj,
  formatDate,
  formatNumber,
  formatPhone,
} from "@/shared/lib/formatting/formatters";

import {
  getModerationRoleLabel,
  getModerationStatusLabel,
} from "../domain/moderation-presentation";
import type {
  BackofficeModerationHistoryItemDto,
  BackofficeReviewConsentDto,
  BackofficeReviewMediaDto,
  BackofficeSubmissionReviewDto,
} from "../types/submission-review.types";

const mediaLabels: Record<BackofficeReviewMediaDto["kind"], string> = {
  AVATAR: "Foto de perfil",
  COVER: "Imagem de capa",
  LOGO: "Logo da empresa",
  SPONSORSHIP_CREATIVE: "Criativo de patrocínio",
};

const consentLabels: Record<
  BackofficeReviewConsentDto["documentType"],
  string
> = {
  CONTACT_VISIBILITY: "Visibilidade de contato",
  PRIVACY: "Privacidade",
  TERMS: "Termos de uso",
};

const historyActionLabels: Record<
  BackofficeModerationHistoryItemDto["action"],
  string
> = {
  APPROVE: "Cadastro aprovado",
  ARCHIVE: "Cadastro arquivado",
  BAN: "Cadastro banido",
  REQUEST_CHANGES: "Correções solicitadas",
  RESTORE: "Acesso restaurado",
  RESUBMIT: "Correções reenviadas",
  SUBMIT: "Envio para análise",
  SUSPEND: "Cadastro suspenso",
  UNBAN: "Banimento removido",
};

function ReviewField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words">{value || "Não informado"}</dd>
    </div>
  );
}

function ProfileCard({ review }: { review: BackofficeSubmissionReviewDto }) {
  if (review.role === "INFLUENCER") {
    return (
      <Card>
        <CardHeader>
          <UserRound aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>Perfil do influenciador</CardTitle>
          <CardDescription>
            Dados declarados na versão {review.profile.version}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <ReviewField label="Nome civil" value={review.profile.legalName} />
            <ReviewField
              label="Nome de exibição"
              value={review.profile.displayName}
            />
            <ReviewField
              label="Tipo de criador"
              value={
                review.profile.creatorType === "UGC" ? "UGC" : "Influenciador"
              }
            />
            <ReviewField
              label="Localização"
              value={[review.profile.city, review.profile.state]
                .filter(Boolean)
                .join(" — ")}
            />
            <ReviewField
              label="WhatsApp"
              value={
                review.profile.whatsappE164
                  ? formatPhone(review.profile.whatsappE164)
                  : null
              }
            />
            <ReviewField
              label="Nichos"
              value={review.profile.niches
                .map((niche) => niche.name)
                .join(", ")}
            />
          </dl>
          <dl>
            <ReviewField label="Biografia" value={review.profile.bio} />
          </dl>

          <div>
            <h3 className="font-semibold">Métricas autodeclaradas</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Estes números são informados pelo próprio criador e não foram
              verificados automaticamente.
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {review.profile.selfReportedMetrics.map((metric) => (
                <li
                  className="rounded-xl border bg-white p-4"
                  key={`${metric.platform}-${metric.observedOn}`}
                >
                  <p className="font-semibold">{metric.platform}</p>
                  <p className="mt-1">
                    {metric.followerCount === null
                      ? "Seguidores não informados"
                      : `${formatNumber(metric.followerCount)} seguidores`}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {metric.engagementRate
                      ? `${metric.engagementRate}% de engajamento`
                      : "Engajamento não informado"}
                  </p>
                  <Badge className="mt-3" variant="outline">
                    Métrica autodeclarada
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Building2 aria-hidden="true" className="text-brand-blue size-5" />
        <CardTitle>Perfil da empresa</CardTitle>
        <CardDescription>
          Dados declarados na versão {review.profile.version}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <ReviewField label="Razão social" value={review.profile.legalName} />
          <ReviewField label="Nome fantasia" value={review.profile.tradeName} />
          <ReviewField label="CNPJ" value={formatCnpj(review.profile.cnpj)} />
          <ReviewField label="Segmento" value={review.profile.segment} />
          <ReviewField
            label="Faixa de colaboradores"
            value={review.profile.employeeRange}
          />
          <ReviewField
            label="WhatsApp"
            value={
              review.profile.whatsappE164
                ? formatPhone(review.profile.whatsappE164)
                : null
            }
          />
          <ReviewField
            label="Site"
            value={
              review.profile.websiteUrl ? (
                <a
                  className="text-brand-blue underline underline-offset-4"
                  href={review.profile.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {review.profile.websiteUrl}
                </a>
              ) : null
            }
          />
        </dl>
        <dl>
          <ReviewField label="Descrição" value={review.profile.description} />
        </dl>

        <Alert>
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Assistência de preenchimento do CNPJ</AlertTitle>
          <AlertDescription>
            {review.cnpjAssistance.disclaimer}
          </AlertDescription>
        </Alert>

        <div>
          <h3 className="font-semibold">Localidades</h3>
          <ul className="mt-3 grid gap-3">
            {review.profile.locations.map((location) => (
              <li
                className="flex gap-3 rounded-xl border p-4"
                key={`${location.label}-${location.street}-${location.number}`}
              >
                <MapPin
                  aria-hidden="true"
                  className="text-brand-blue mt-0.5 size-5 shrink-0"
                />
                <div>
                  <p className="font-semibold">
                    {location.label}
                    {location.isPrimary ? " — principal" : ""}
                  </p>
                  <p>
                    {location.street}, {location.number}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[location.neighborhood, location.city, location.state]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceCards({ review }: { review: BackofficeSubmissionReviewDto }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <ImageIcon aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>Mídias enviadas</CardTitle>
          <CardDescription>
            Metadados dos arquivos privados vinculados ao perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {review.media.length ? (
            <ul className="space-y-3">
              {review.media.map((media) => (
                <li className="rounded-xl border p-4" key={media.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{mediaLabels[media.kind]}</p>
                    <Badge variant="outline">{media.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {media.mimeType}
                    {media.width && media.height
                      ? ` — ${media.width} × ${media.height} px`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhuma mídia vinculada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <FileCheck2 aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>Consentimentos</CardTitle>
          <CardDescription>
            Versões aceitas e vigência no momento da revisão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {review.consents.length ? (
            <ul className="space-y-3">
              {review.consents.map((consent) => (
                <li
                  className="rounded-xl border p-4"
                  key={`${consent.documentType}-${consent.contentHash}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {consentLabels[consent.documentType]} — versão{" "}
                      {consent.versionLabel}
                    </p>
                    <Badge
                      variant={consent.isCurrent ? "default" : "secondary"}
                    >
                      {consent.isCurrent ? "Vigente" : "Anterior"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Aceito em {formatDate(consent.acceptedAt)} · referência{" "}
                    {consent.contentHash.slice(0, 8)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Nenhum consentimento localizado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContactAndSocialCard({
  review,
}: {
  review: BackofficeSubmissionReviewDto;
}) {
  const whatsapp = review.profile.whatsappE164;
  const preferences = review.contactPreferences;

  return (
    <Card>
      <CardHeader>
        <UserRound aria-hidden="true" className="text-brand-blue size-5" />
        <CardTitle>Contato e redes sociais</CardTitle>
        <CardDescription>
          Dados privados visíveis somente nesta revisão autorizada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <ReviewField
            label="E-mail operacional"
            value={review.account.operationalEmail}
          />
          <ReviewField
            label="WhatsApp"
            value={whatsapp ? formatPhone(whatsapp) : null}
          />
          <ReviewField
            label="E-mail no catálogo"
            value={
              preferences?.emailVisibleToApprovedCompanies
                ? "Autorizado"
                : "Não autorizado"
            }
          />
          <ReviewField
            label="WhatsApp no catálogo"
            value={
              preferences?.whatsappVisibleToApprovedCompanies
                ? "Autorizado"
                : "Não autorizado"
            }
          />
          <ReviewField
            label="Redes sociais no catálogo"
            value={
              preferences?.socialVisibleToApprovedCompanies
                ? "Autorizadas"
                : "Não autorizadas"
            }
          />
        </dl>

        <div>
          <h3 className="font-semibold">Perfis sociais</h3>
          {review.socialProfiles.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {review.socialProfiles.map((social) => (
                <li className="rounded-xl border p-4" key={social.url}>
                  <p className="text-muted-foreground text-xs font-semibold">
                    {social.platform}
                  </p>
                  <a
                    className="text-brand-blue mt-1 block font-semibold break-all underline underline-offset-4"
                    href={social.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {social.handle || social.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-2">
              Nenhum perfil social informado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModerationHistory({
  history,
}: {
  history: BackofficeModerationHistoryItemDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CalendarClock aria-hidden="true" className="text-brand-blue size-5" />
        <CardTitle>Histórico de moderação</CardTitle>
        <CardDescription>
          Eventos imutáveis ordenados do mais recente para o mais antigo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l pl-5">
          {history.map((event) => (
            <li className="relative" key={event.id}>
              <span className="bg-brand-blue absolute top-1.5 -left-[1.48rem] size-2.5 rounded-full ring-4 ring-white" />
              <p className="font-semibold">
                {historyActionLabels[event.action]}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {getModerationStatusLabel(event.fromStatus)} →{" "}
                {getModerationStatusLabel(event.toStatus)} ·{" "}
                {formatDate(event.occurredAt)}
              </p>
              {event.reason ? (
                <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm">
                  {event.reason}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function SubmissionReview({
  review,
}: {
  review: BackofficeSubmissionReviewDto;
}) {
  const title =
    review.role === "INFLUENCER"
      ? review.profile.displayName
      : review.profile.tradeName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 ring-1 ring-black/8 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {getModerationRoleLabel(review.role)}
            </Badge>
            <Badge variant="secondary">
              {getModerationStatusLabel(review.account.status)}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2">
            Enviado em{" "}
            {review.account.submittedAt
              ? formatDate(review.account.submittedAt)
              : "data não informada"}{" "}
            · conta v{review.account.version} · perfil v{review.profile.version}
          </p>
        </div>

        <Progress
          aria-label={`Completude do cadastro: ${review.account.completion.percentage}%`}
          className="w-full max-w-xs"
          value={review.account.completion.percentage}
        >
          <ProgressLabel>Completude</ProgressLabel>
          <ProgressValue>
            {() => `${review.account.completion.percentage}%`}
          </ProgressValue>
        </Progress>
      </div>

      <ProfileCard review={review} />
      <ContactAndSocialCard review={review} />
      <EvidenceCards review={review} />
      <ModerationHistory history={review.moderation.history} />

      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
        <BadgeCheck aria-hidden="true" />
        <AlertTitle>Versão pronta para decisão</AlertTitle>
        <AlertDescription>
          As ações administrativas validam novamente as versões da conta e do
          perfil antes de alterar o status.
        </AlertDescription>
      </Alert>
    </div>
  );
}
