import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import {
  CatalogCreatorCard,
  type CatalogCreatorCardViewModel,
} from "./catalog-creator-card";

const creator: CatalogCreatorCardViewModel = {
  bioExcerpt:
    "Crio conteúdo sobre rotina, beleza e consumo consciente para marcas.",
  city: "São Paulo",
  cover: {
    alt: "",
    src: "https://media.example.test/signed/cover",
  },
  creatorId: "10000000-0000-4000-8000-000000000001",
  creatorType: "UGC",
  detailHref: "/app/creators/10000000-0000-4000-8000-000000000001",
  displayName: "Marina Conteúdo",
  media: {
    alt: "Retrato de Marina Conteúdo",
    src: "https://media.example.test/signed/avatar",
  },
  metrics: [
    {
      label: "Seguidores no Instagram",
      value: "24 mil",
    },
  ],
  niches: [
    { name: "Beleza", slug: "beleza" },
    { name: "Lifestyle", slug: "lifestyle" },
  ],
  primarySocial: {
    followerLabel: "24 mil seguidores",
    handle: "@marinaconteudo",
    platform: "INSTAGRAM",
  },
  socialPlatforms: ["INSTAGRAM", "TIKTOK"],
  state: "SP",
};

describe("CatalogCreatorCard", () => {
  it("presents the approved card fields and the primary social channel", () => {
    const { container } = render(<CatalogCreatorCard creator={creator} />);

    expect(
      screen.getByRole("heading", { name: "Marina Conteúdo", level: 3 }),
    ).toBeVisible();
    expect(screen.getByText("Criador UGC")).toBeVisible();
    expect(screen.getByText("São Paulo, SP")).toBeVisible();
    expect(screen.getByText("Beleza")).toBeVisible();
    expect(screen.getByText("@marinaconteudo")).toBeVisible();
    expect(screen.getByText(/24 mil seguidores/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver perfil de Marina Conteúdo" }),
    ).toHaveAttribute("href", creator.detailHref);
    expect(
      screen.getByRole("img", { name: creator.media?.alt }),
    ).toHaveAttribute("src", creator.media?.src);
    expect(container.querySelector(`img[src="${creator.cover?.src}"]`)).not.toBeNull();
  });

  it("uses a safe media fallback without inventing a participant image", () => {
    const { container } = render(
      <CatalogCreatorCard
        creator={{
          ...creator,
          cover: null,
          media: null,
          metrics: [],
        }}
      />,
    );

    expect(
      screen.getByLabelText("Marina Conteúdo está sem foto de perfil"),
    ).toBeVisible();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = render(<CatalogCreatorCard creator={creator} />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
