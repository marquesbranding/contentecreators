import {
  Building2,
  CalendarClock,
  FileCheck2,
  History,
  ImageIcon,
  Mail,
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
  getMediaStatusLabel,
  getModerationStatusLabel,
} from "../domain/moderation-presentation";
import type {
  BackofficeAccountDetailDto,
  BackofficeAccountMediaDto,
} from "../types/account-detail.types";
import type {
  BackofficeModerationHistoryItemDto,
  BackofficeReviewConsentDto,
} from "../types/submission-review.types";

const employeeRangeLabels = {
  "11_TO_50": "11 a 50 colaboradores",
  "201_TO_500": "201 a 500 colaboradores",
  "51_TO_200": "51 a 200 colaboradores",
  MORE_THAN_500: "Mais de 500 colaboradores",
  UP_TO_10: "Até 10 colaboradores",
} as const;

const consentLabels: Record<
  BackofficeReviewConsentDto["documentType"],
  string
> = {
  CONTACT_VISIBILITY: "Visibilidade de contato",
  PRIVACY: "Privacidade",
  TERMS: "Termos de uso",
};

const mediaLabels: Record<BackofficeAccountMediaDto["kind"], string> = {
  AVATAR: "Foto de perfil",
  COVER: "Imagem de capa",
  LOGO: "Logo da empresa",
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words">{value || "Não informado"}</dd>
    </div>
  );
}

function accountRoleLabel(role: BackofficeAccountDetailDto["account"]["role"]) {
  if (role === "ADMIN") {
    return "Administrador";
  }

  if (role === "COMPANY") {
    return "Empresa";
  }

  if (role === "INFLUENCER") {
    return "Influenciador";
  }

  return "Papel não definido";
}

function displayName(detail: BackofficeAccountDetailDto) {
  return detail.profile?.editableProfile
    ? detail.profile.kind === "COMPANY"
      ? detail.profile.editableProfile.tradeName
      : detail.profile.editableProfile.displayName
    : detail.account.operationalEmail.split("@")[0];
}

function ProfileCard({
  detail,
  profileActions,
}: {
  detail: BackofficeAccountDetailDto;
  profileActions?: React.ReactNode;
}) {
  if (!detail.profile?.editableProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados de perfil</CardTitle>
          <CardDescription>
            Informações específicas do papel desta conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>Perfil ainda incompleto</AlertTitle>
            <AlertDescription>
              Esta conta ainda não possui todos os dados necessários para uma
              edição estruturada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (detail.profile.kind === "INFLUENCER") {
    const profile = detail.profile.editableProfile;

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <UserRound
                aria-hidden="true"
                className="text-brand-blue mb-3 size-5"
              />
              <CardTitle>Perfil do influenciador</CardTitle>
              <CardDescription>
                Dados da versão {profile.version}.
              </CardDescription>
            </div>
            {profileActions}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome civil" value={profile.legalName} />
            <Field label="Nome de exibição" value={profile.displayName} />
            <Field
              label="Tipo de creator"
              value={profile.creatorType === "UGC" ? "UGC" : "Influenciador"}
            />
            <Field
              label="Localização"
              value={[profile.city, profile.state].filter(Boolean).join(" — ")}
            />
            <Field
              label="WhatsApp"
              value={
                profile.whatsapp ? formatPhone(profile.whatsapp) : undefined
              }
            />
            <Field label="Nichos" value={profile.nicheSlugs.join(", ")} />
            <Field label="Rede principal" value={profile.socialPlatform} />
            <Field
              label="Seguidores autodeclarados"
              value={formatNumber(profile.followers)}
            />
            <Field
              label="Engajamento autodeclarado"
              value={`${profile.engagementRate}%`}
            />
          </dl>
          <dl>
            <Field label="Biografia" value={profile.bio} />
          </dl>
          <a
            className="text-brand-blue inline-flex break-all underline underline-offset-4"
            href={profile.socialUrl}
            rel="noreferrer"
            target="_blank"
          >
            {profile.socialUrl}
          </a>
          <div>
            <h3 className="font-semibold">
              Histórico de métricas autodeclaradas
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Informações fornecidas pelo próprio creator, sem verificação
              automática.
            </p>
            {detail.profile.selfReportedMetrics.length ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {detail.profile.selfReportedMetrics.map((metric) => (
                  <li
                    className="rounded-xl border p-4"
                    key={`${metric.platform}-${metric.observedOn}`}
                  >
                    <p className="font-semibold">{metric.platform}</p>
                    <p className="mt-1 text-sm">
                      {metric.followerCount === null
                        ? "Seguidores não informados"
                        : `${formatNumber(metric.followerCount)} seguidores`}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {metric.engagementRate === null
                        ? "Engajamento não informado"
                        : `${metric.engagementRate}% de engajamento`}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Referência: {formatDate(metric.observedOn)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Nenhuma métrica registrada.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const profile = detail.profile.editableProfile;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Building2
              aria-hidden="true"
              className="text-brand-blue mb-3 size-5"
            />
            <CardTitle>Perfil da empresa</CardTitle>
            <CardDescription>
              Dados da versão {profile.version}.
            </CardDescription>
          </div>
          {profileActions}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Razão social" value={profile.legalName} />
          <Field label="Nome fantasia" value={profile.tradeName} />
          <Field label="CNPJ" value={formatCnpj(profile.cnpj)} />
          <Field label="Segmento" value={profile.segment} />
          <Field
            label="Faixa de colaboradores"
            value={employeeRangeLabels[profile.employeeRange]}
          />
          <Field
            label="WhatsApp"
            value={profile.whatsapp ? formatPhone(profile.whatsapp) : undefined}
          />
          <Field
            label="Site"
            value={
              profile.websiteUrl ? (
                <a
                  className="text-brand-blue underline underline-offset-4"
                  href={profile.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {profile.websiteUrl}
                </a>
              ) : null
            }
          />
          <Field
            label="Rede social"
            value={
              profile.socialUrl ? (
                <a
                  className="text-brand-blue underline underline-offset-4"
                  href={profile.socialUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {profile.socialPlatform}
                </a>
              ) : null
            }
          />
        </dl>
        <dl>
          <Field label="Descrição" value={profile.description} />
        </dl>

        <div>
          <h3 className="font-semibold">Localidades</h3>
          <ul className="mt-3 grid gap-3">
            {[
              {
                city: profile.city,
                complement: profile.complement,
                label: "Localidade principal",
                neighborhood: profile.neighborhood,
                number: profile.number,
                postalCode: profile.postalCode,
                state: profile.state,
                street: profile.street,
              },
              ...profile.additionalLocations,
            ].map((location, index) => (
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
                    {index === 0 ? " — principal" : ""}
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

function EvidenceCards({ detail }: { detail: BackofficeAccountDetailDto }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <ImageIcon aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>Mídias do perfil</CardTitle>
          <CardDescription>
            Metadados seguros dos arquivos privados, incluindo versões
            arquivadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.media.length ? (
            <ul className="space-y-3">
              {detail.media.map((media) => (
                <li className="rounded-xl border p-4" key={media.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{mediaLabels[media.kind]}</p>
                    <Badge variant="outline">
                      {getMediaStatusLabel(media.status)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {media.mimeType} — {formatNumber(media.sizeBytes)} bytes
                    {media.width && media.height
                      ? ` — ${media.width} × ${media.height} px`
                      : ""}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Versão {media.version} · incluída em{" "}
                    {formatDate(media.createdAt)}
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
            Versões aceitas e vigência atual, sem contexto técnico sensível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.consents.length ? (
            <ul className="space-y-3">
              {detail.consents.map((consent) => (
                <li
                  className="rounded-xl border p-4"
                  key={`${consent.documentType}-${consent.contentHash}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {consentLabels[consent.documentType]}
                    </p>
                    <Badge variant={consent.isCurrent ? "default" : "outline"}>
                      {consent.isCurrent ? "Vigente" : "Histórico"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {consent.versionLabel} · aceito em{" "}
                    {formatDate(consent.acceptedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Nenhum consentimento registrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ModerationHistory({ detail }: { detail: BackofficeAccountDetailDto }) {
  return (
    <Card>
      <CardHeader>
        <History aria-hidden="true" className="text-brand-blue size-5" />
        <CardTitle>Histórico de moderação</CardTitle>
        <CardDescription>
          Linha do tempo imutável das decisões sobre esta conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {detail.moderation?.history.length ? (
          <ol className="relative ml-2 space-y-6 border-l pl-6">
            {detail.moderation.history.map((event) => (
              <li key={event.id}>
                <span className="bg-brand-blue absolute -left-1.5 mt-1.5 size-3 rounded-full" />
                <p className="font-semibold">
                  {historyActionLabels[event.action]}
                </p>
                <p className="text-muted-foreground text-sm">
                  {getModerationStatusLabel(event.fromStatus)} →{" "}
                  {getModerationStatusLabel(event.toStatus)} ·{" "}
                  {formatDate(event.occurredAt)}
                </p>
                {event.reason ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                    {event.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">
            Esta conta ainda não possui eventos de moderação.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OperationalMetadata({
  detail,
}: {
  detail: BackofficeAccountDetailDto;
}) {
  const account = detail.account;

  return (
    <Card>
      <CardHeader>
        <CalendarClock aria-hidden="true" className="text-brand-blue size-5" />
        <CardTitle>Metadados operacionais</CardTitle>
        <CardDescription>
          Estado corrente e datas necessárias para operação e diagnóstico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Papel" value={accountRoleLabel(account.role)} />
          <Field label="Versão da conta" value={account.version} />
          <Field
            label="Versão da completude"
            value={account.completion.version}
          />
          <Field label="Criada em" value={formatDate(account.createdAt)} />
          <Field label="Atualizada em" value={formatDate(account.updatedAt)} />
          <Field
            label="Enviada em"
            value={account.submittedAt ? formatDate(account.submittedAt) : null}
          />
          <Field
            label="Aprovada em"
            value={account.approvedAt ? formatDate(account.approvedAt) : null}
          />
          <Field
            label="Suspensa em"
            value={account.suspendedAt ? formatDate(account.suspendedAt) : null}
          />
          <Field
            label="Banida em"
            value={account.bannedAt ? formatDate(account.bannedAt) : null}
          />
          <Field
            label="Arquivada em"
            value={account.archivedAt ? formatDate(account.archivedAt) : null}
          />
          <Field
            label="Sequência da submissão"
            value={detail.moderation?.currentSubmissionSequence}
          />
          <Field
            label="Versão da moderação"
            value={detail.moderation?.caseVersion}
          />
        </dl>

        {detail.contactPreferences ? (
          <div>
            <h3 className="font-semibold">Preferências de contato</h3>
            <ul className="text-muted-foreground mt-2 grid gap-1 text-sm">
              <li>
                E-mail para empresas aprovadas:{" "}
                {detail.contactPreferences.emailVisibleToApprovedCompanies
                  ? "permitido"
                  : "não permitido"}
              </li>
              <li>
                WhatsApp para empresas aprovadas:{" "}
                {detail.contactPreferences.whatsappVisibleToApprovedCompanies
                  ? "permitido"
                  : "não permitido"}
              </li>
              <li>
                Redes sociais para empresas aprovadas:{" "}
                {detail.contactPreferences.socialVisibleToApprovedCompanies
                  ? "permitido"
                  : "não permitido"}
              </li>
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AccountDetail({
  detail,
  profileActions,
}: {
  detail: BackofficeAccountDetailDto;
  /**
   * Extension point for task 17.3. Pass an authorized admin edit trigger/form
   * here; `detail.profile.editableProfile` already carries the profile version.
   */
  profileActions?: React.ReactNode;
}) {
  const name = displayName(detail);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-brand-blue text-sm font-bold">
            Gestão administrativa
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            {name}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 break-all">
            <Mail aria-hidden="true" className="size-4 shrink-0" />
            {detail.account.operationalEmail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{getModerationStatusLabel(detail.account.status)}</Badge>
          <Badge variant="outline">
            {accountRoleLabel(detail.account.role)}
          </Badge>
          {detail.account.archivedAt ? (
            <Badge variant="destructive">Arquivada</Badge>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="pt-1">
          <Progress
            aria-label={`Conclusão do perfil: ${detail.account.completion.percentage}%`}
            value={detail.account.completion.percentage}
          >
            <ProgressLabel>Completude do perfil</ProgressLabel>
            <ProgressValue>
              {() => `${detail.account.completion.percentage}%`}
            </ProgressValue>
          </Progress>
        </CardContent>
      </Card>

      <ProfileCard detail={detail} profileActions={profileActions} />
      <EvidenceCards detail={detail} />
      <ModerationHistory detail={detail} />
      <OperationalMetadata detail={detail} />
    </div>
  );
}
