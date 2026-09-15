import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
  PublicShowcaseCompanyDto,
  PublicShowcaseCreatorDto,
} from "../types/public-landing-showcase.types";
import { PublicCommunityProof } from "./public-community-proof";

const signedUrl =
  "https://project.supabase.co/storage/v1/object/sign/a.webp?token=x";
const coverUrl =
  "https://project.supabase.co/storage/v1/object/sign/cover.webp?token=y";

const creator: PublicShowcaseCreatorDto = {
  avatar: null,
  bioExcerpt: "Conteudo de beleza e lifestyle para marcas locais.",
  city: "Joacaba",
  cover: { height: 900, url: coverUrl, width: 1600 },
  creatorType: "UGC",
  displayName: "Fernanda Souza",
  id: "creator-1",
  kind: "CREATOR",
  metric: {
    engagementRate: 3.52,
    followerCount: 1_600_000,
    platform: "INSTAGRAM",
  },
  niches: [{ name: "Beleza", slug: "beleza" }],
  state: "SC",
};

const company: PublicShowcaseCompanyDto = {
  city: "São Paulo",
  cover: null,
  id: "company-1",
  kind: "COMPANY",
  logo: { height: 256, url: signedUrl, width: 256 },
  segment: "Alimentação",
  state: "SP",
  tradeName: "Padoca do Vale",
};

function showcaseCreator(id: string, displayName: string) {
  return { ...creator, displayName, id };
}

function showcaseCompany(id: string, tradeName: string) {
  return { ...company, id, tradeName };
}

/** Four entries is the bar for rotating; below it the row stays still. */
const rotatingItems = [
  creator,
  company,
  showcaseCreator("creator-2", "Bruno Lima"),
  showcaseCompany("company-2", "Mercado Sul"),
];

const marqueeCompany = {
  city: null,
  companyId: "company-9",
  segment: "Moda",
  state: null,
  tradeName: "Marca Beta",
};

const marquee = { companies: [marqueeCompany] };

const rotatingMarquee = {
  companies: ["Beta", "Gama", "Delta", "Epsilon"].map((name, index) => ({
    ...marqueeCompany,
    companyId: `company-${index}`,
    tradeName: `Marca ${name}`,
  })),
};

function movingRow(container: HTMLElement) {
  return container.querySelector('[data-slot="scroll-velocity-row"]');
}

describe("PublicCommunityProof", () => {
  it("keeps the brand marquee and carousels the enabled creators and companies", () => {
    render(
      <PublicCommunityProof
        proof={marquee}
        showcase={{ items: rotatingItems }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Creators e marcas em destaque" }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Marcas aprovadas" }),
    ).toHaveTextContent("Marca Beta");
    expect(
      screen.getByRole("region", {
        name: "Carrossel de creators e marcas em destaque",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("creator-listing")[0]).toHaveTextContent(
      "Fernanda Souza",
    );
    expect(screen.getByText("FS")).toBeVisible();
    expect(
      screen
        .getAllByTestId("creator-listing")[0]
        ?.querySelector(`img[src="${coverUrl}"]`),
    ).not.toBeNull();
    expect(screen.getAllByText("1,6 mi seguidores")[0]).toBeVisible();
    expect(screen.getAllByTestId("company-listing")[0]).toHaveTextContent(
      "Padoca do Vale",
    );
    expect(
      screen.getByRole("img", { name: "Logo de Padoca do Vale" }),
    ).toHaveAttribute("src", signedUrl);
    expect(
      screen.queryByTestId("showcase-placeholder"),
    ).not.toBeInTheDocument();
  });

  it("offers all three signup paths next to the showcase", () => {
    render(
      <PublicCommunityProof proof={marquee} showcase={{ items: [creator] }} />,
    );

    expect(
      screen.getByRole("link", { name: "Sou Influenciador" }),
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
    expect(screen.getByRole("link", { name: "Sou UGC" })).toHaveAttribute(
      "href",
      "/sign-up?intent=ugc",
    );
    expect(screen.getByRole("link", { name: "Sou Empresa" })).toHaveAttribute(
      "href",
      "/sign-up?intent=company",
    );
  });

  it("lets visitors jump to any item with the carousel dots", async () => {
    const user = userEvent.setup();
    render(
      <PublicCommunityProof proof={null} showcase={{ items: rotatingItems }} />,
    );

    const dots = screen.getByRole("tablist", { name: "Escolher destaque" });

    expect(within(dots).getAllByRole("tab")).toHaveLength(rotatingItems.length);
    expect(
      within(dots).getByRole("tab", {
        name: `Ir para 1 de ${rotatingItems.length}`,
      }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(
      within(dots).getByRole("tab", {
        name: `Ir para 2 de ${rotatingItems.length}`,
      }),
    );
  });

  it("holds the space with placeholders until someone is enabled", () => {
    render(<PublicCommunityProof proof={marquee} showcase={{ items: [] }} />);

    expect(screen.getAllByTestId("showcase-placeholder")).toHaveLength(4);
    expect(screen.queryByTestId("creator-listing")).not.toBeInTheDocument();
    expect(screen.getByText("Marca Beta")).toBeVisible();
  });

  it("renders the showcase even when the marquee could not load", () => {
    render(
      <PublicCommunityProof proof={null} showcase={{ items: [company] }} />,
    );

    expect(
      screen.queryByRole("list", { name: "Marcas aprovadas" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("company-listing")).toBeInTheDocument();
  });

  it("shows a lone profile once and fills the rest with invites", () => {
    const { container } = render(
      <PublicCommunityProof proof={marquee} showcase={{ items: [creator] }} />,
    );

    expect(screen.getAllByTestId("creator-listing")).toHaveLength(1);
    expect(screen.getAllByTestId("showcase-placeholder")).toHaveLength(3);
    expect(
      screen.queryByRole("region", {
        name: "Carrossel de creators e marcas em destaque",
      }),
    ).not.toBeInTheDocument();
    expect(movingRow(container)).toBeNull();
  });

  it("keeps three profiles still and starts rotating at four", () => {
    const { container, unmount } = render(
      <PublicCommunityProof
        proof={null}
        showcase={{ items: rotatingItems.slice(0, 3) }}
      />,
    );

    expect(screen.getAllByTestId("showcase-placeholder")).toHaveLength(1);
    expect(movingRow(container)).toBeNull();

    unmount();
    const rotating = render(
      <PublicCommunityProof proof={null} showcase={{ items: rotatingItems }} />,
    );

    expect(
      screen.queryByTestId("showcase-placeholder"),
    ).not.toBeInTheDocument();
    expect(movingRow(rotating.container)).not.toBeNull();
  });

  it("only scrolls the brand strip once there are enough brands to loop", () => {
    const still = render(
      <PublicCommunityProof proof={marquee} showcase={null} />,
    );

    expect(
      within(still.container.querySelector("section") as HTMLElement).getByRole(
        "list",
        { name: "Marcas aprovadas" },
      ),
    ).toHaveTextContent("Marca Beta");
    expect(movingRow(still.container)).toBeNull();

    still.unmount();
    const moving = render(
      <PublicCommunityProof proof={rotatingMarquee} showcase={null} />,
    );

    expect(movingRow(moving.container)).not.toBeNull();
  });

  it("renders nothing when neither source could load", () => {
    const { container } = render(
      <PublicCommunityProof proof={null} showcase={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
