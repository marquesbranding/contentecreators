import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

interface AuthPageShellProps {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function AuthPageShell({
  children,
  description,
  eyebrow,
  title,
}: AuthPageShellProps) {
  return (
    <main
      className="bg-brand-canvas grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]"
      id="main-content"
      tabIndex={-1}
    >
      <section className="bg-brand-night relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          aria-hidden="true"
          className="bg-brand-pink/25 absolute -top-24 -left-24 size-80 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-brand-blue/25 absolute right-0 bottom-0 size-96 rounded-full blur-3xl"
        />
        <Link
          aria-label="Voltar para a página inicial"
          className="relative w-fit rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
          href="/"
        >
          <BrandLogo className="w-[12.5rem]" preload />
        </Link>

        <div className="relative max-w-lg">
          <p className="text-brand-lime text-sm font-bold tracking-[0.12em] uppercase">
            Creators e marcas, no mesmo ritmo
          </p>
          <h2 className="mt-5 text-5xl leading-[1.02] font-extrabold tracking-[-0.05em]">
            Um acesso simples para conexões felizes.
          </h2>
          <div className="mt-8 grid gap-3 text-sm text-white/70">
            <p className="flex items-center gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="text-brand-sky size-5"
              />
              Sessão protegida pelo Supabase Auth
            </p>
            <p className="flex items-center gap-3">
              <BadgeCheck
                aria-hidden="true"
                className="text-brand-lime size-5"
              />
              Cadastro com curadoria humana
            </p>
          </div>
        </div>

        <p className="relative text-sm text-white/60">Contente Creators</p>
      </section>

      <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-[32rem]">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <Link
              aria-label="Contente Creators — início"
              className="focus-visible:ring-brand-blue/50 rounded-md focus-visible:ring-3 focus-visible:outline-none"
              href="/"
            >
              <BrandLogo preload />
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold focus-visible:ring-3 focus-visible:outline-none"
              href="/"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Início
            </Link>
          </div>

          <Card className="gap-0 rounded-3xl py-0 shadow-[0_24px_70px_rgba(8,8,8,0.09)]">
            <CardHeader className="gap-3 px-6 pt-7 pb-5 sm:px-8 sm:pt-9">
              <p className="text-brand-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                {eyebrow}
              </p>
              <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                <h1>{title}</h1>
              </CardTitle>
              <CardDescription className="max-w-md text-base leading-7">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-7 sm:px-8 sm:pb-9">
              {children}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
