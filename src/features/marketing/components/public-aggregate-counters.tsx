import { Building2, UsersRound } from "lucide-react";

import type { PublicAggregateCountersDto } from "../types/public-aggregate-counters.types";

const counterDefinitions = [
  {
    icon: UsersRound,
    key: "approvedCreators",
    label: "Creators aprovados",
  },
  {
    icon: Building2,
    key: "approvedCompanies",
    label: "Empresas aprovadas",
  },
] as const;

export function PublicAggregateCounters({
  counters,
}: {
  counters: PublicAggregateCountersDto | null;
}) {
  if (!counters) {
    return null;
  }

  const visibleCounters = counterDefinitions.filter(
    ({ key }) => (counters[key] ?? 0) > 0,
  );

  if (visibleCounters.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="public-aggregate-title"
      className="bg-brand-night px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12"
      data-testid="public-aggregate-counters"
    >
      <div className="mx-auto w-full max-w-[90rem]">
        <p
          className="text-brand-lime text-sm font-extrabold tracking-[0.12em] uppercase"
          id="public-aggregate-title"
        >
          Comunidade com curadoria
        </p>
        <div className="mt-5 grid gap-3 sm:max-w-2xl sm:grid-cols-2">
          {visibleCounters.map(({ icon: Icon, key, label }) => (
            <article
              className="rounded-3xl border border-white/15 bg-white/[0.06] p-5"
              key={key}
            >
              <Icon aria-hidden="true" className="text-brand-sky size-6" />
              <p className="mt-5 text-4xl font-extrabold tracking-[-0.045em]">
                {counters[key]}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">
                {label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
