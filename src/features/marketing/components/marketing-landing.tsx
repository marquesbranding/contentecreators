import {
  ArrowUpRight,
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
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingHeader } from "@/features/marketing/components/marketing-header";
import { buildRegistrationHref } from "@/features/marketing/domain/registration-intent";
import { AuroraText } from "@/registry/magicui/aurora-text";
import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/registry/magicui/scroll-based-velocity";
import { TextAnimate } from "@/registry/magicui/text-animate";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

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

const vevoxFacts = [
  {
    description:
      "Experiências objetivas, com informação organizada e menos atrito.",
    icon: SearchCheck,
    title: "Clareza primeiro",
  },
  {
    description:
      "Produtos digitais sustentados com consistência, revisão e evolução contínua.",
    icon: ShieldCheck,
    title: "Entrega controlada",
  },
  {
    description:
      "Construção perto da operação, ouvindo contexto antes de propor caminho.",
    icon: MessageCircle,
    title: "Proximidade real",
  },
] as const;

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

function AudienceSection() {
  return (
    <section
      aria-labelledby="audience-title"
      className="bg-brand-night py-16 text-white sm:py-20 lg:py-24"
      id="para-quem"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="max-w-5xl">
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
          <p className="mt-5 max-w-5xl text-lg leading-8 text-white/65 xl:whitespace-nowrap">
            {copy.audience.description}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article
            className="bg-brand-pink text-brand-night flex h-full scroll-mt-24 flex-col rounded-[1.75rem] border border-white/10 p-6 shadow-[0_24px_70px_rgba(245,22,126,0.16)] sm:p-8 lg:p-10"
            id="para-creators"
          >
            <UserRoundSearch className="size-10" aria-hidden="true" />
            <p className="mt-8 text-sm font-extrabold tracking-[0.12em] uppercase">
              {copy.audience.creator.label}
            </p>
            <h3 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              {copy.audience.creator.title}
            </h3>
            <p className="mt-4 max-w-xl text-base leading-7 sm:text-lg lg:min-h-[5.25rem]">
              {copy.audience.creator.description}
            </p>
            <ul className="mt-7 flex-1 space-y-3">
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
            className="bg-brand-sky text-brand-night flex h-full scroll-mt-24 flex-col rounded-[1.75rem] border border-white/10 p-6 shadow-[0_24px_70px_rgba(30,155,240,0.16)] sm:p-8 lg:p-10"
            id="para-empresas"
          >
            <Building2 className="size-10" aria-hidden="true" />
            <p className="mt-8 text-sm font-extrabold tracking-[0.12em] uppercase">
              {copy.audience.company.label}
            </p>
            <h3 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
              {copy.audience.company.title}
            </h3>
            <p className="mt-4 max-w-xl text-base leading-7 sm:text-lg lg:min-h-[5.25rem]">
              {copy.audience.company.description}
            </p>
            <ul className="mt-7 flex-1 space-y-3">
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
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div className="lg:self-start">
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
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#686868] xl:whitespace-nowrap">
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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[21%] right-16 hidden aspect-[2857/1039] w-[19rem] max-w-[32vw] overflow-hidden opacity-20 lg:block xl:right-24 xl:w-[24rem]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="absolute h-auto max-w-none select-none"
            decoding="async"
            height={3334}
            loading="lazy"
            src="/brand/official/contente-creators-white.png"
            style={{ left: "-7.42%", top: "-98.08%", width: "116.74%" }}
            width={3334}
          />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[34%] right-10 hidden aspect-[2857/1039] w-[23rem] max-w-[40vw] overflow-hidden opacity-95 lg:block xl:right-16 xl:w-[29rem]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="absolute h-auto max-w-none select-none"
            decoding="async"
            height={3334}
            loading="lazy"
            src="/brand/official/contente-creators-lime-blue.png"
            style={{ left: "-9.8%", top: "-110.39%", width: "116.7%" }}
            width={3334}
          />
        </span>
        <Search
          aria-hidden="true"
          className="absolute -top-10 -right-8 size-48 rotate-12 text-white/10 sm:size-64"
          strokeWidth={1.4}
        />
        <div className="relative max-w-4xl lg:max-w-[43rem]">
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
                buttonVariants({ size: "lg" }),
                "bg-brand-lime text-brand-night hover:bg-brand-lime/90 w-full rounded-full sm:w-auto",
              )}
              href={influencerHref}
            >
              {copy.hero.creatorCta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-brand-lime text-brand-lime hover:bg-brand-lime hover:text-brand-night w-full rounded-full bg-transparent sm:w-auto",
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

function ByVevoxInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            aria-label="Abrir informações sobre a Vevox"
            className="inline-flex min-h-8 items-center justify-center rounded-md px-2 py-1 transition-colors hover:bg-white/[0.06] focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            type="button"
          />
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="h-5 w-auto opacity-80 transition-opacity hover:opacity-100"
          decoding="async"
          height={24}
          loading="lazy"
          src="/logos/by-vevox-512.webp"
          width={132}
        />
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#111114] p-0 text-white sm:max-w-lg">
        <DialogHeader className="gap-3 p-6 pr-12 pb-4">
          <DialogTitle className="text-2xl font-semibold tracking-normal text-white">
            Sobre a Vevox
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-white/70">
            A Vevox cria produtos digitais com pesquisa constante, identidade
            consistente e foco em clareza. Interfaces simples, decisões
            controladas e proximidade real para evoluir com segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 px-6 pb-5">
          {vevoxFacts.map((fact) => (
            <div
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
              key={fact.title}
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-white/[0.08] text-white/80">
                <fact.icon aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {fact.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/[0.62]">
                  {fact.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 bg-black/20 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-[15rem] text-xs leading-5 text-white/[0.55]">
            Plataforma desenvolvida e sustentada pela Vevox.
          </p>
          <a
            className="inline-flex min-h-10 min-w-[11rem] shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:border-white/[0.35] hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="https://vevox.com.br/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Conhecer a Vevox
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
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
          <div className="inline-flex w-fit items-center gap-3">
            <span>Desenvolvido por</span>
            <ByVevoxInfoDialog />
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLanding({
  publicCommunityProof = null,
  publicPromotion = null,
  supportContactEmail = null,
}: {
  publicCommunityProof?: ReactNode;
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
              <p className="mt-7 max-w-[39rem] text-lg leading-8 text-white/70 sm:text-xl sm:leading-9">
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
        {publicCommunityProof}
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
