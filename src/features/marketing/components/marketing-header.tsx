import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import { buttonVariants } from "@/shared/components/ui/button";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

const copy = ptBR.marketing;

export function MarketingHeader() {
  return (
    <header className="bg-brand-night/95 sticky top-0 z-50 border-b border-white/10 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between gap-4 px-5 sm:h-20 sm:px-8 lg:px-12">
        <Link
          aria-label="Contente Creators — início"
          className="shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
          href="/"
        >
          <BrandLogo />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 lg:flex"
        >
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#para-quem"
          >
            {copy.navigation.forWho}
          </a>
          <a
            className="text-sm font-semibold text-white/75 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href="#como-funciona"
          >
            {copy.navigation.howItWorks}
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
