import { CheckCircle2, Clock3, FileSearch, LogOut } from "lucide-react";

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

export function AnalysisPending({
  signOutAction,
}: {
  signOutAction: () => Promise<void>;
}) {
  return (
    <main className="bg-brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden="true"
        className="bg-brand-blue/15 absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <Card className="relative w-full max-w-2xl gap-0 overflow-hidden rounded-3xl py-0 shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
        <CardHeader className="items-start gap-4 border-b px-6 py-7 sm:px-9 sm:py-9">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <Badge className="gap-2 rounded-full" variant="secondary">
            <Clock3 aria-hidden="true" />
            Análise em andamento
          </Badge>
          <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            <h1>Seu cadastro está sendo analisado</h1>
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            Recebemos suas informações. Enquanto a revisão não for concluída,
            nenhuma listagem do catálogo será carregada ou exibida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 py-7 sm:px-9">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl border p-4">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
              />
              <div>
                <strong className="text-sm">Cadastro recebido</strong>
                <p className="text-muted-foreground mt-1 text-sm leading-5">
                  Seus dados estão salvos com segurança.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border p-4">
              <FileSearch
                aria-hidden="true"
                className="text-brand-blue mt-0.5 size-5 shrink-0"
              />
              <div>
                <strong className="text-sm">Revisão manual</strong>
                <p className="text-muted-foreground mt-1 text-sm leading-5">
                  A equipe confere o perfil antes da liberação.
                </p>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-6">
            Você receberá um e-mail quando houver uma atualização. Se forem
            necessárias correções, o formulário será reaberto com as
            orientações.
          </p>
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
