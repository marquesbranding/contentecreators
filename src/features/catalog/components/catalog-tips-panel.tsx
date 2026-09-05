import { KeyRound, Sparkles, Wand2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const tips = [
  {
    body: "Informações atualizadas no seu perfil aumentam suas chances de ser encontrado por uma marca. Fique ligado para não perder nenhuma oportunidade!",
    icon: Wand2,
    title: "Atualize suas informações",
  },
  {
    body: "As marcas estão sempre de olho em novas parcerias. Aproveite as informações no perfil delas e entre em contato para se apresentar, vai que dá match!",
    icon: Sparkles,
    title: "Aproveite as marcas",
  },
  {
    body: "Todas as marcas por análise de perfil, mas nunca deixe de fazer contrato e formalizar suas parcerias! Nosso propósito é de conexão, o resto é com vocês!",
    icon: KeyRound,
    title: "Segurança sempre",
  },
] as const;

export function CatalogTipsPanel() {
  return (
    <section aria-labelledby="catalog-tips-heading" className="space-y-4">
      <h2 className="sr-only" id="catalog-tips-heading">
        Dicas para o seu perfil
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {tips.map((tip) => {
          const Icon = tip.icon;

          return (
            <Card className="h-full" key={tip.title}>
              <CardHeader>
                <div className="bg-brand-blue-soft text-brand-blue flex size-10 items-center justify-center rounded-xl">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle className="text-base">{tip.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-justify text-sm leading-6 text-pretty hyphens-auto">
                {tip.body}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
