import { Sparkles, UserRound } from "lucide-react";

import type { DescriptiveRadioCardOption } from "../components/descriptive-radio-card-group.client";

export type CreatorTypeValue = "INFLUENCER" | "UGC";

/**
 * Shared between the signup wizard's account-type step (where COMPANY is a
 * third option alongside these) and the post-Google onboarding step (where
 * role is already fixed and only these two apply). Keeping one copy avoids
 * the two surfaces drifting apart.
 */
export const creatorTypeOptions: readonly DescriptiveRadioCardOption<CreatorTypeValue>[] =
  [
    {
      description:
        "Influenciador é uma pessoa com muitos seguidores que compartilha opiniões e conteúdos capazes de impactar decisões, comportamentos e compras de seus seguidores.",
      icon: UserRound,
      label: "Sou influencer",
      value: "INFLUENCER",
    },
    {
      description:
        "UGC é conteúdo criado por pessoas comuns, geralmente com poucos seguidores, que compartilham experiências reais com uma marca ou produto.",
      icon: Sparkles,
      label: "Sou UGC",
      value: "UGC",
    },
  ];
