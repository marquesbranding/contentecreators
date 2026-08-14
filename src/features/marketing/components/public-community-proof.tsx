import { BarChart3, MapPin, ShieldCheck } from "lucide-react";

import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/registry/magicui/scroll-based-velocity";

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
    <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 rounded-lg border border-black/10 bg-white p-3">
      {metric.followerCount ? (
        <div className="min-w-0">
          <dt className="text-[0.7rem] font-bold text-black/45">Seguidores</dt>
          <dd className="text-brand-pink text-xl font-extrabold">
            {formatCompactNumber(metric.followerCount)}
          </dd>
        </div>
      ) : null}
      {metric.engagementRate ? (
        <div className="min-w-0">
          <dt className="text-[0.7rem] font-bold text-black/45">Engajamento</dt>
          <dd className="text-brand-pink text-xl font-extrabold">
            {formatEngagement(metric.engagementRate)}
          </dd>
        </div>
      ) : null}
      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[0.72rem] font-semibold text-black/45">
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
        <div className="max-w-3xl">
          <p className="text-brand-blue text-sm font-extrabold tracking-[0.12em] uppercase">
            Comunidade em movimento
          </p>
          <h2
            className="mt-4 max-w-2xl text-3xl leading-[1.05] font-extrabold sm:text-5xl"
            id="public-community-proof-title"
          >
            Creators e marcas em destaque
          </h2>
        </div>

        {proof.companies.length > 0 ? (
          <div className="mt-10 overflow-hidden border-y border-black/10 py-5">
            <ScrollVelocityContainer>
              <ScrollVelocityRow
                baseVelocity={2}
                className="text-xl font-extrabold tracking-[0.02em] text-black/40 uppercase sm:text-2xl"
                direction={-1}
              >
                <ul aria-label="Marcas aprovadas" className="flex items-center">
                  {proof.companies.map((company) => (
                    <li
                      className="flex shrink-0 items-center gap-8 pr-8"
                      key={company.companyId}
                    >
                      <span>{company.tradeName}</span>
                      <span
                        aria-hidden="true"
                        className="bg-brand-lime size-2 shrink-0 rounded-full"
                      />
                    </li>
                  ))}
                </ul>
              </ScrollVelocityRow>
            </ScrollVelocityContainer>
          </div>
        ) : null}

        {proof.creators.length > 0 ? (
          <ul
            aria-label="Creators em destaque"
            className="mt-8 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {proof.creators.map((creator) => (
              <li
                className="flex h-full min-w-0 flex-col rounded-lg border border-black/10 bg-[#f7f6f2] p-5 shadow-sm"
                data-testid="creator-listing"
                key={creator.creatorId}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-brand-blue text-xs font-extrabold tracking-[0.08em] uppercase">
                      {creatorTypeLabels[creator.creatorType]}
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold break-words">
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
                  <p className="mt-4 line-clamp-3 text-sm leading-6 [overflow-wrap:anywhere] text-black/55">
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

                <div className="mt-auto min-w-0 pt-5">
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
