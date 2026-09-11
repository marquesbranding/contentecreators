import { UserRoundPlus } from "lucide-react";
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
import type { PublicLandingShowcaseDto } from "../types/public-landing-showcase.types";
import { LandingShowcaseCarousel } from "./landing-showcase-carousel.client";

const influencerHref = buildRegistrationHref("INFLUENCER");
const ugcHref = buildRegistrationHref("UGC");
const companyHref = buildRegistrationHref("COMPANY");
const PLACEHOLDER_SLOTS = 3;

/**
 * Holds the carousel's shape before anyone is enabled in the backoffice. It
 * invites sign-ups rather than imitating a profile: no invented name, photo or
 * metric, since a public page must not present fictional people as members.
 */
function ShowcasePlaceholderCard() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-[#f7f6f2]"
      data-testid="showcase-placeholder"
    >
      <div
        aria-hidden="true"
        className="from-brand-blue/15 via-brand-pink/10 to-brand-lime/15 relative h-20 bg-gradient-to-br sm:h-24"
      >
        <span className="absolute -bottom-7 left-4 flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-white text-black/60 shadow-sm">
          <UserRoundPlus className="size-7" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-9 pb-4">
        <p className="text-base font-extrabold text-black">Seu perfil aqui</p>
        <p className="text-xs leading-5 text-black/70">
          Os creators e marcas em destaque aparecem neste espaço.
        </p>
      </div>
    </div>
  );
}

export function PublicCommunityProof({
  proof,
  showcase,
}: {
  proof: PublicCommunityProofDto | null;
  showcase: PublicLandingShowcaseDto | null;
}) {
  // `null` means "could not load"; hide only when both sources are missing.
  if (!proof && !showcase) {
    return null;
  }

  const companies = proof?.companies ?? [];

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

        {companies.length > 0 ? (
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
                  {companies.map((company) => (
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

        {showcase ? (
          showcase.items.length > 0 ? (
            <LandingShowcaseCarousel items={showcase.items} />
          ) : (
            <ul
              aria-label="Espaço para creators e marcas em destaque"
              className="mt-8 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {Array.from({ length: PLACEHOLDER_SLOTS }, (_, slot) => (
                <li className="min-w-0" key={slot}>
                  <ShowcasePlaceholderCard />
                </li>
              ))}
            </ul>
          )
        ) : null}

        {/* Same three paths, same hierarchy as the hero: one registration, the
            button only pre-selects the account type. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full rounded-full sm:w-auto",
            )}
            href={influencerHref}
          >
            {ptBR.marketing.hero.creatorCta}
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand-pink text-brand-night hover:bg-brand-pink/90 w-full rounded-full sm:w-auto",
            )}
            href={ugcHref}
          >
            {ptBR.marketing.hero.ugcCta}
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "border-brand-night text-brand-night hover:bg-brand-night w-full rounded-full bg-transparent hover:text-white sm:w-auto",
            )}
            href={companyHref}
          >
            {ptBR.marketing.hero.companyCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
