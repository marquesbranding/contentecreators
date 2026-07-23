import { LockKeyhole, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/shared/components/brand-logo";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress, ProgressLabel } from "@/shared/components/ui/progress";

export function OnboardingFormShell({
  children,
  description,
  eyebrow = "Cadastro para análise",
  progress = 50,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  progress?: number;
  title: string;
}) {
  return (
    <main className="bg-brand-canvas relative min-h-screen overflow-hidden px-4 py-5 sm:px-8 sm:py-9">
      <div
        aria-hidden="true"
        className="bg-brand-blue/15 absolute -top-64 left-1/2 size-[38rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <Badge className="gap-1.5 rounded-full px-3 py-1.5" variant="outline">
            <LockKeyhole aria-hidden="true" />
            Dados protegidos
          </Badge>
        </header>

        <Card className="mt-6 gap-0 overflow-hidden rounded-3xl py-0 shadow-[0_28px_80px_rgba(8,8,8,0.1)] sm:mt-9">
          <CardHeader className="gap-4 border-b px-5 py-6 sm:px-9 sm:py-8">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] text-[#0757d8] uppercase">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {eyebrow}
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              <h1>{title}</h1>
            </CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">
              {description}
            </CardDescription>
            <Progress aria-label="Progresso do cadastro" value={progress}>
              <ProgressLabel>Etapa atual</ProgressLabel>
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {progress === 100 ? "Pronto para enviar" : "Perfil e acesso"}
              </span>
            </Progress>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-9 sm:py-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
