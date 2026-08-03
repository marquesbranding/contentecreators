import { BarChart3, MapPin, ShieldCheck } from "lucide-react";

import type {
  PublicCommunityCreatorDto,
  PublicCommunityCreatorMetricDto,
  PublicCommunityProofDto,
} from "../types/public-community-proof.types";

const creatorTypeLabels = {
  INFLUENCER: "Influenciador",
  UGC: "Criador UGC",
} as const;

const platformLabels = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Rede social",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
} as const;

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function formatEngagement(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function CreatorMetric({
  metric,
}: {
  metric: PublicCommunityCreatorMetricDto | null;
}) {
  if (!metric?.followerCount && !metric?.engagementRate) {
    return null;
  }

  return (
    <dl className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 bg-white p-3">
      {metric.followerCount ? (
        <div>
          <dt className="text-[0.7rem] font-bold text-black/45">Seguidores</dt>
          <dd className="text-brand-pink text-xl font-extrabold">
            {formatCompactNumber(metric.followerCount)}
          </dd>
        </div>
      ) : null}
      {metric.engagementRate ? (
        <div>
          <dt className="text-[0.7rem] font-bold text-black/45">Engajamento</dt>
          <dd className="text-brand-pink text-xl font-extrabold">
            {formatEngagement(metric.engagementRate)}
          </dd>
        </div>
      ) : null}
      <div className="col-span-2 flex items-center gap-1.5 text-[0.72rem] font-semibold text-black/45">
        <BarChart3 aria-hidden="true" className="size-3.5" />
        {platformLabels[metric.platform]} · informado pelo creator
      </div>
    </dl>
  );
}

function CreatorLocation({
  city,
  state,
}: Pick<PublicCommunityCreatorDto, "city" | "state">) {
  const location = [city, state].filter(Boolean).join(", ");

  if (!location) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-black/55">
      <MapPin aria-hidden="true" className="size-4 shrink-0" />
      {location}
    </p>
  );
}

export function PublicCommunityProof({
  proof,
}: {
  proof: PublicCommunityProofDto | null;
}) {
  if (!proof || (proof.companies.length === 0 && proof.creators.length === 0)) {
    return null;
  }

  return (
    <section
      aria-labelledby="public-community-proof-title"
      className="bg-white py-14 text-black sm:py-16"
      data-testid="public-community-proof"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
          <div>
            <p className="text-brand-blue text-sm font-extrabold tracking-[0.12em] uppercase">
              Comunidade em movimento
            </p>
            <h2
              className="mt-4 max-w-2xl text-3xl leading-[1.05] font-extrabold sm:text-5xl"
              id="public-community-proof-title"
            >
              Creators e marcas em destaque
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#686868]">
              Um espaço público para apresentar a força da comunidade sem expor
              dados privados antes da aprovação.
            </p>
          </div>

          {proof.companies.length > 0 ? (
            <div className="overflow-hidden border-y border-black/10 py-5">
              <p className="mb-4 text-center text-xs font-bold text-black/45">
                Marcas que já impulsionam seus resultados conosco
              </p>
              <ul
                aria-label="Marcas aprovadas"
                className="flex min-w-max flex-wrap items-center justify-center gap-3"
              >
                {proof.companies.map((company) => (
                  <li
                    className="rounded-md border border-black/10 bg-[#f7f6f2] px-4 py-2 text-sm font-extrabold text-black/55 uppercase"
                    key={company.companyId}
                  >
                    {company.tradeName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {proof.creators.length > 0 ? (
          <ul
            aria-label="Creators em destaque"
            className="mt-8 grid gap-5 md:grid-cols-3"
          >
            {proof.creators.map((creator) => (
              <li
                className="flex h-full flex-col rounded-lg border border-black/10 bg-[#f7f6f2] p-5 shadow-sm"
                data-testid="creator-listing"
                key={creator.creatorId}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-brand-blue text-xs font-extrabold tracking-[0.08em] uppercase">
                      {creatorTypeLabels[creator.creatorType]}
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold">
                      {creator.displayName}
                    </h3>
                    <CreatorLocation
                      city={creator.city}
                      state={creator.state}
                    />
                  </div>
                  <ShieldCheck
                    aria-label="Perfil aprovado"
                    className="text-brand-blue size-6 shrink-0"
                  />
                </div>

                {creator.bioExcerpt ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-black/55">
                    {creator.bioExcerpt}
                  </p>
                ) : null}

                {creator.niches.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {creator.niches.map((niche) => (
                      <li
                        className="rounded-md bg-black/10 px-2.5 py-1 text-xs font-bold text-black/55"
                        key={niche.slug}
                      >
                        {niche.name}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto pt-5">
                  <CreatorMetric metric={creator.metric} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
