import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";

export function LegalPageHeader() {
  return (
    <header className="border-b border-white/15 bg-black">
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link
          aria-label="Contente Creators — início"
          className="rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
          href="/"
        >
          <BrandLogo />
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-white focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </Link>
      </div>
    </header>
  );
}
