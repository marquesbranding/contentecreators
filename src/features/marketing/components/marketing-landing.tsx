import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleCheck,
  HelpCircle,
  Mail,
  MessageCircle,
  Music2,
  Search,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingHeader } from "@/features/marketing/components/marketing-header";
import { buildRegistrationHref } from "@/features/marketing/domain/registration-intent";
import type { PublicAggregateCountersDto } from "@/features/marketing/types/public-aggregate-counters.types";
import { AuroraText } from "@/registry/magicui/aurora-text";
import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/registry/magicui/scroll-based-velocity";
import { TextAnimate } from "@/registry/magicui/text-animate";
import { BrandLogo } from "@/shared/components/brand-logo";
import { buttonVariants } from "@/shared/components/ui/button";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

import { PublicAggregateCounters } from "./public-aggregate-counters";

const copy = ptBR.marketing;
const influencerHref = buildRegistrationHref("INFLUENCER");
const companyHref = buildRegistrationHref("COMPANY");

const journeyIcons = [
  Sparkles,
  UserRoundSearch,
  BadgeCheck,
  CircleCheck,
] as const;

const journeyIconStyles = [
  "bg-brand-blue text-white",
  "bg-brand-pink text-brand-night",
  "bg-brand-sky text-brand-night",
  "bg-brand-lime text-brand-night",
] as const;

const socialIcons = {
  Facebook: MessageCircle,
  Instagram: AtSign,
  LinkedIn: BriefcaseBusiness,
  TikTok: Music2,
} as const;

function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[34rem] lg:mx-0"
    >
      <div className="bg-brand-pink/20 absolute -inset-8 rounded-full blur-3xl" />
      <div className="marketing-preview-surface relative overflow-hidden rounded-[1.75rem] border border-white/15">
        <div className="bg-brand-royal flex h-12 items-center justify-between border-b border-white/10 px-4 text-white">
          <div className="flex gap-1.5">
            <span className="bg-brand-pink size-2.5 rounded-full" />
            <span className="bg-brand-lime size-2.5 rounded-full" />
            <span className="bg-brand-sky size-2.5 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-[0.12em] uppercase">
            Sua jornada
          </span>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {copy.hero.preview.items.map((item, index) => (
            <div
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-3.5 sm:p-4",
                index === 1
                  ? "border-brand-sky/45 bg-brand-sky/15 translate-x-2"
                  : "border-white/10 bg-white/[0.06]",
              )}
              key={item.title}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-extrabold text-white">
                0{index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white sm:text-base">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-white/60 sm:text-sm">
                  {item.description}
                </span>
              </span>
              <Check className="text-brand-lime ml-auto size-5 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-brand-night bg-brand-lime text-brand-night absolute -right-2 -bottom-7 flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-extrabold shadow-[0_14px_35px_rgba(0,0,0,0.35)] sm:right-5">
        <BadgeCheck className="size-5" />
        {copy.hero.preview.badge}
      </div>
    </div>
  );
}

function MotionStrip() {
  return (
    <section
      aria-label="O que move a Contente Creators"
      className="bg-brand-blue border-y border-white/15 py-3 text-white sm:py-4"
      data-testid="marketing-motion-strip"
    >
      <ScrollVelocityContainer>
        <ScrollVelocityRow
          baseVelocity={2}
          className="text-sm font-extrabold tracking-[0.12em] uppercase sm:text-base"
          direction={-1}
        >
          <div className="flex items-center">
            {copy.motionStrip.map((item) => (
              <span
                className="flex items-center gap-5 pr-5 sm:gap-8 sm:pr-8"
                key={item}
              >
                <span>{item}</span>
                <span
                  aria-hidden="true"
                  className="bg-brand-lime size-2 shrink-0 rounded-full"
                />
              </span>
            ))}
          </div>
        </ScrollVelocityRow>
      </ScrollVelocityContainer>
    </section>
  );
}

function PublicProofPreview() {
  return (
    <section
      aria-labelledby="proof-preview-title"
      className="bg-white py-14 text-black sm:py-16"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-brand-blue text-sm font-extrabold tracking-[0.12em] uppercase">
              Comunidade em movimento
            </p>
            <h2
              className="mt-4 max-w-2xl text-3xl leading-[1.05] font-extrabold tracking-[-0.04em] sm:text-5xl"
              id="proof-preview-title"
            >
              {copy.proofPreview.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#686868]">
              {copy.proofPreview.description}
            </p>
          </div>

          <div className="overflow-hidden border-y border-black/10 py-6">
            <div aria-hidden="true" className="mb-6">
              <ScrollVelocityContainer>
                <ScrollVelocityRow
                  baseVelocity={1.4}
                  className="flex items-center"
                  direction={1}
                >
                  <div className="flex items-center gap-10 pr-10">
                    {Array.from({ length: 8 }, (_, index) => (
                      <BrandLogo
                        background="transparent"
                        className="w-[11rem] opacity-90"
                        key={index}
                        variant="black"
                      />
                    ))}
                  </div>
                </ScrollVelocityRow>
              </ScrollVelocityContainer>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {copy.proofPreview.items.map((item) => (
                <li
                  className="border border-black/10 bg-[#f7f6f2] px-4 py-3 text-sm font-extrabold tracking-[0.08em] uppercase"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section
      aria-labelledby="audience-title"
      className="bg-brand-night py-16 text-white sm:py-20 lg:py-24"
      id="para-quem"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold tracking-[0.12em] uppercase">
            <AuroraText
              colors={["#c5f500", "#1e9bf0", "#f5167e", "#c5f500"]}
              speed={0.8}
            >
              {copy.audience.eyebrow}
            </AuroraText>
          </p>
          <TextAnimate
            animation="blurInUp"
            as="h2"
            by="word"
            className="mt-4 text-4xl leading-[1.02] font-extrabold tracking-[-0.045em] sm:text-5xl lg:text-6xl"
            id="audience-title"
            once
          >
            {copy.audience.title}
          </TextAnimate>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
            {copy.audience.description}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article
            className="bg-brand-pink text-brand-night scroll-mt-24 rounded-[1.75rem] border border-white/10 p-6 shadow-[0_24px_70px_rgba(245,22,126,0.16)] sm:p-8 lg:p-10"
            id="para-creators"
          >
            <UserRoundSearch className="size-10" aria-hidden="true" />
            <p className="mt-8 text-sm font-extrabold tracking-[0.12em] uppercase">
              {copy.audience.creator.label}
            </p>
            <h3 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              {copy.audience.creator.title}
            </h3>
            <p className="mt-4 max-w-xl text-base leading-7 sm:text-lg">
              {copy.audience.creator.description}
            </p>
            <ul className="mt-7 space-y-3">
              {copy.audience.creator.benefits.map((benefit) => (
                <li
                  className="flex items-start gap-3 font-semibold"
                  key={benefit}
                >
                  <CircleCheck
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "secondary" }),
                "bg-brand-night hover:bg-brand-night/90 mt-8 w-full rounded-full text-white sm:w-auto",
              )}
              href={influencerHref}
            >
              {copy.hero.creatorCta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>

          <article
            className="bg-brand-sky text-brand-night scroll-mt-24 rounded-[1.75rem] border border-white/10 p-6 shadow-[0_24px_70px_rgba(30,155,240,0.16)] sm:p-8 lg:p-10"
            id="para-empresas"
          >
            <Building2 className="size-10" aria-hidden="true" />
            <p className="mt-8 text-sm font-extrabold tracking-[0.12em] uppercase">
              {copy.audience.company.label}
            </p>
            <h3 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              {copy.audience.company.title}
            </h3>
            <p className="mt-4 max-w-xl text-base leading-7 sm:text-lg">
              {copy.audience.company.description}
            </p>
            <ul className="mt-7 space-y-3">
              {copy.audience.company.benefits.map((benefit) => (
                <li
                  className="flex items-start gap-3 font-semibold"
                  key={benefit}
                >
                  <CircleCheck
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-night hover:bg-brand-night/90 mt-8 w-full rounded-full text-white sm:w-auto",
              )}
              href={companyHref}
            >
              {copy.hero.companyCta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  return (
    <section
      aria-labelledby="steps-title"
      className="bg-[#f7f6f2] py-16 sm:py-20 lg:py-28"
      id="como-funciona"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-extrabold tracking-[0.12em] text-[#0059db] uppercase">
              {copy.steps.eyebrow}
            </p>
            <TextAnimate
              animation="slideUp"
              as="h2"
              by="word"
              className="mt-4 text-4xl leading-[1.04] font-extrabold tracking-[-0.045em] text-black sm:text-5xl"
              id="steps-title"
              once
            >
              {copy.steps.title}
            </TextAnimate>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#686868]">
              {copy.steps.description}
            </p>
          </div>

          <ol className="grid gap-4">
            {copy.steps.items.map((item, index) => {
              const Icon = journeyIcons[index];

              return (
                <li
                  className="grid grid-cols-[3rem_1fr] gap-4 rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(8,8,8,0.06)] sm:grid-cols-[4rem_1fr] sm:gap-6 sm:p-7"
                  key={item.number}
                >
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl sm:size-16",
                      journeyIconStyles[index],
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5 sm:size-6" />
                  </span>
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-xl font-extrabold tracking-[-0.025em] text-black sm:text-2xl">
                        {item.title}
                      </h3>
                      <span className="font-mono text-sm font-bold text-[#686868]">
                        {item.number}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl leading-7 text-[#686868] sm:text-lg">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section
      aria-labelledby="faq-title"
      className="bg-[#f7f6f2] px-5 py-14 sm:px-8 sm:py-16 lg:px-12"
      id="faq"
    >
      <div className="mx-auto grid max-w-[90rem] gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div>
          <p className="text-brand-blue text-sm font-extrabold tracking-[0.12em] uppercase">
            {copy.faq.eyebrow}
          </p>
          <h2
            className="mt-4 text-4xl leading-[1.04] font-extrabold tracking-[-0.045em] text-black sm:text-5xl"
            id="faq-title"
          >
            {copy.faq.title}
          </h2>
        </div>
        <div className="grid gap-3">
          {copy.faq.items.map((item) => (
            <details
              className="group border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(8,8,8,0.05)]"
              key={item.question}
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 text-lg font-extrabold tracking-[-0.015em] text-black marker:hidden">
                <HelpCircle
                  aria-hidden="true"
                  className="text-brand-blue size-5 shrink-0"
                />
                <span>{item.question}</span>
                <span className="ml-auto text-2xl leading-none group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 leading-7 text-[#686868]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="bg-white px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
      <div
        className="marketing-cta-surface relative mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] border border-white/15 px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20"
        data-testid="marketing-final-cta"
      >
        {/* The supplied brand watermark is already optimized and decorative. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-4 bottom-4 w-[22rem] max-w-[70vw] opacity-10 sm:right-10 sm:bottom-8 sm:w-[34rem]"
          decoding="async"
          height={3334}
          loading="lazy"
          src="/brand/official/contente-creators-white.png"
          width={3334}
        />
        <Search
          aria-hidden="true"
          className="absolute -top-10 -right-8 size-48 rotate-12 text-white/10 sm:size-64"
          strokeWidth={1.4}
        />
        <div className="relative max-w-4xl">
          <p className="text-sm font-extrabold tracking-[0.12em] text-white uppercase">
            {copy.finalCta.eyebrow}
          </p>
          <h2 className="mt-4 text-4xl leading-[1.02] font-extrabold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {copy.finalCta.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white">
            {copy.finalCta.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "secondary" }),
                "w-full rounded-full bg-white text-black hover:bg-white/90 sm:w-auto",
              )}
              href={influencerHref}
            >
              {copy.hero.creatorCta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full rounded-full border-white/50 bg-transparent text-white hover:bg-white hover:text-black sm:w-auto",
              )}
              href={companyHref}
            >
              {copy.hero.companyCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter({
  supportContactEmail,
}: {
  supportContactEmail: string | null;
}) {
  const institutionalLinks = [
    { href: "#faq", label: copy.footer.faq },
    { href: "/terms", label: copy.footer.terms },
    { href: "/privacy", label: copy.footer.privacy },
  ];

  return (
    <footer className="bg-brand-night text-white">
      <div className="mx-auto w-full max-w-[90rem] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(12rem,0.55fr)_minmax(16rem,0.75fr)] lg:items-start">
          <div className="max-w-md">
            <p className="text-2xl font-extrabold tracking-[-0.03em]">
              {ptBR.brand.name}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/58">
              {copy.footer.tagline}
            </p>
          </div>

          <nav aria-label="Links institucionais">
            <h2 className="text-brand-lime text-xs font-extrabold tracking-[0.14em] uppercase">
              Institucional
            </h2>
            <div className="mt-4 grid gap-3">
              {institutionalLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    className="w-fit text-sm font-semibold text-white/68 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
                    href={link.href}
                    key={link.label}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    className="w-fit text-sm font-semibold text-white/68 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
                    href={link.href}
                    key={link.label}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </nav>

          <div>
            <h2 className="text-brand-lime text-xs font-extrabold tracking-[0.14em] uppercase">
              Contato
            </h2>
            {supportContactEmail ? (
              <a
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition-colors hover:border-white/35 hover:bg-white/[0.08] hover:text-white focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
                href={`mailto:${supportContactEmail}`}
              >
                <Mail aria-hidden="true" className="size-4" />
                {copy.footer.supportContact}
              </a>
            ) : null}
            <nav
              aria-label="Redes sociais"
              className="mt-5 flex flex-wrap gap-3"
            >
              {copy.footer.socialLinks.map((link) => {
                const Icon = socialIcons[link.label];

                return (
                  <a
                    aria-label={link.label}
                    className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/45 hover:text-white focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
                    href={link.href}
                    key={link.label}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/12 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {copy.footer.copyright}
          </p>
          <a
            aria-label="Conhecer a Vevox"
            className="inline-flex w-fit items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-white/[0.04] focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="https://vevox.com.br/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Desenvolvido por</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Vevox"
              className="h-5 w-auto opacity-80 transition-opacity hover:opacity-100"
              decoding="async"
              height={24}
              loading="lazy"
              src="/logos/by-vevox-512.webp"
              width={132}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLanding({
  aggregateCounters = null,
  aggregateCountersSlot = null,
  publicPromotion = null,
  supportContactEmail = null,
}: {
  aggregateCounters?: PublicAggregateCountersDto | null;
  aggregateCountersSlot?: ReactNode;
  publicPromotion?: ReactNode;
  supportContactEmail?: string | null;
}) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f6f2]">
      <MarketingHeader />
      <main id="main-content" tabIndex={-1}>
        <section
          className="marketing-hero-surface relative overflow-hidden pt-28 pb-14 text-white sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24"
          data-testid="marketing-hero"
        >
          <div className="relative mx-auto grid w-full max-w-[90rem] gap-16 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-12">
            <div className="max-w-3xl">
              <div className="border-brand-lime/35 bg-brand-lime/10 text-brand-lime inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold tracking-[0.1em] uppercase sm:text-sm">
                <Sparkles aria-hidden="true" className="size-4" />
                {copy.hero.eyebrow}
              </div>
              <h1
                aria-label={copy.hero.title}
                className="mt-7 text-[clamp(2.9rem,8.5vw,6.7rem)] leading-[0.9] font-extrabold tracking-[-0.065em] text-white"
              >
                <span className="block">Creators e marcas</span>
                <span className="block">conectados</span>
                <span className="mt-2 block bg-linear-to-r from-[#1e9bf0] via-[#c5f500] to-[#f5167e] bg-clip-text text-transparent">
                  no mesmo ritmo.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl sm:leading-9">
                {copy.hero.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full rounded-full shadow-[0_12px_35px_rgba(3,106,252,0.3)] sm:w-auto",
                  )}
                  href={influencerHref}
                >
                  {copy.hero.creatorCta}
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "hover:text-brand-night w-full rounded-full border-white/35 bg-white/5 text-white hover:bg-white sm:w-auto",
                  )}
                  href={companyHref}
                >
                  {copy.hero.companyCta}
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm font-medium text-white/65">
                <CircleCheck
                  aria-hidden="true"
                  className="text-brand-lime size-4"
                />
                {copy.hero.note}
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <MotionStrip />
        <PublicProofPreview />
        {aggregateCountersSlot ?? (
          <PublicAggregateCounters counters={aggregateCounters} />
        )}
        {publicPromotion ? (
          <section aria-label="Conteúdo promocional" className="bg-[#f7f6f2]">
            {publicPromotion}
          </section>
        ) : null}
        <AudienceSection />
        <StepsSection />
        <FaqSection />
        <FinalCallToAction />
      </main>
      <MarketingFooter supportContactEmail={supportContactEmail} />
    </div>
  );
}
