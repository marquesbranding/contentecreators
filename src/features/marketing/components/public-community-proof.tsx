import Link from "next/link";

import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/registry/magicui/scroll-based-velocity";
import { buttonVariants } from "@/shared/components/ui/button";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

import { buildRegistrationHref } from "../domain/registration-intent";
import type { PublicCommunityProofDto } from "../types/public-community-proof.types";
import { PublicCommunityCreatorCard } from "./public-community-creator-card";

const companyHref = buildRegistrationHref("COMPANY");

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
              {/* black/40 renders as #999 on white — 2.84:1, under even the
                  3:1 large-text floor. black/55 clears 4.5:1 at any size, so
                  the strip stays muted without failing the a11y smoke. */}
              <ScrollVelocityRow
                baseVelocity={2}
                className="text-xl font-extrabold tracking-[0.02em] text-black/55 uppercase sm:text-2xl"
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
                className="min-w-0"
                data-testid="creator-listing"
                key={creator.creatorId}
              >
                <PublicCommunityCreatorCard creator={creator} />
              </li>
            ))}
          </ul>
        ) : null}

        {proof.creators.length > 0 ? (
          /* The profile pages themselves are behind approval, so the card
             carries no per-card link; one section CTA sends the audience that
             wants to browse creators — brands — to the right signup. */
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand-night hover:bg-brand-night/90 mt-8 w-full rounded-full text-white sm:w-auto",
            )}
            href={companyHref}
          >
            {ptBR.marketing.hero.companyCta}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
