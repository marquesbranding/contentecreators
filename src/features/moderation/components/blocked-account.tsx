import { ArrowLeft, ShieldBan } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function BlockedAccount() {
  return (
    <main className="bg-brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden="true"
        className="bg-destructive/10 absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <Card className="relative w-full max-w-xl gap-0 overflow-hidden rounded-3xl py-0 shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
        <CardHeader className="items-start gap-4 border-b px-6 py-7 sm:px-9 sm:py-9">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <span className="bg-destructive/10 text-destructive inline-flex size-12 items-center justify-center rounded-2xl">
            <ShieldBan aria-hidden="true" className="size-6" />
          </span>
          <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            <h1>Esta conta está bloqueada</h1>
          </CardTitle>
          <CardDescription className="max-w-lg text-base leading-7">
            O acesso à plataforma foi encerrado. Não é possível editar o
            cadastro, reenviar informações ou criar outro acesso com esta
            identidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-7 sm:px-9">
          <p className="text-muted-foreground text-sm leading-6">
            Por segurança, esta tela não exibe detalhes da decisão. Caso a
            equipe tenha fornecido um canal de atendimento, use somente esse
            contato oficial.
          </p>
          <Link className={buttonVariants({ variant: "outline" })} href="/">
            <ArrowLeft aria-hidden="true" />
            Voltar ao início
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
