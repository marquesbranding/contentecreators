import { CirclePause, LogOut, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/shared/components/brand-logo";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function SuspendedAccount({
  signOutAction,
}: {
  signOutAction: () => Promise<void>;
}) {
  return (
    <main className="bg-brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden="true"
        className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl"
      />
      <Card className="relative w-full max-w-xl gap-0 overflow-hidden rounded-3xl py-0 shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
        <CardHeader className="items-start gap-4 border-b px-6 py-7 sm:px-9 sm:py-9">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <Badge className="gap-2 rounded-full" variant="outline">
            <CirclePause aria-hidden="true" />
            Acesso temporariamente suspenso
          </Badge>
          <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            <h1>Seu acesso está suspenso</h1>
          </CardTitle>
          <CardDescription className="max-w-lg text-base leading-7">
            O catálogo e os dados de outros participantes não ficam disponíveis
            durante a suspensão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-7 sm:px-9">
          <div className="flex gap-3 rounded-2xl border p-4">
            <ShieldCheck
              aria-hidden="true"
              className="text-brand-blue mt-0.5 size-5 shrink-0"
            />
            <p className="text-muted-foreground text-sm leading-6">
              Se a equipe forneceu orientações ou um canal de atendimento, siga
              somente a comunicação oficial recebida.
            </p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut aria-hidden="true" />
              Sair da conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
