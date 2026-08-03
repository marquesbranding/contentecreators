import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import { buttonVariants } from "@/shared/components/ui/button";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

const copy = ptBR.marketing;

export function MarketingHeader() {
  return (
    <header className="absolute top-0 right-0 left-0 z-50 text-white">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between gap-4 px-5 sm:h-20 sm:px-8 lg:px-12">
        <Link
          aria-label="Contente Creators — início"
          className="shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
          href="/"
        >
          <BrandLogo background="transparent" variant="white" />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-7 lg:flex"
        >
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#para-creators"
          >
            {copy.navigation.forCreators}
          </a>
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#para-empresas"
          >
            {copy.navigation.forCompanies}
          </a>
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#como-funciona"
          >
            {copy.navigation.howItWorks}
          </a>
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#faq"
          >
            {copy.navigation.faq}
          </a>
        </nav>

        <Link
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "min-w-24 rounded-full border-white/25 bg-white text-black hover:border-white hover:bg-white/90",
          )}
          href="/login"
        >
          {ptBR.common.enter}
        </Link>
      </div>
    </header>
  );
}
