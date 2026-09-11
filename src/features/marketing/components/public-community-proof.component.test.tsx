import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
  PublicShowcaseCompanyDto,
  PublicShowcaseCreatorDto,
} from "../types/public-landing-showcase.types";
import { PublicCommunityProof } from "./public-community-proof";

const signedUrl =
  "https://project.supabase.co/storage/v1/object/sign/a.webp?token=x";

const creator: PublicShowcaseCreatorDto = {
  avatar: null,
  bioExcerpt: "Conteudo de beleza e lifestyle para marcas locais.",
  city: "Joacaba",
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
  id: "company-1",
  kind: "COMPANY",
  logo: { height: 256, url: signedUrl, width: 256 },
  segment: "Alimentação",
  state: "SP",
  tradeName: "Padoca do Vale",
};

const marquee = {
  companies: [
    {
      city: null,
      companyId: "company-9",
      segment: "Moda",
      state: null,
      tradeName: "Marca Beta",
    },
  ],
};

describe("PublicCommunityProof", () => {
  it("keeps the brand marquee and carousels the enabled creators and companies", () => {
    render(
      <PublicCommunityProof
        proof={marquee}
        showcase={{ items: [creator, company] }}
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
    expect(screen.getByTestId("creator-listing")).toHaveTextContent(
      "Fernanda Souza",
    );
    expect(screen.getByText("FS")).toBeVisible();
    expect(screen.getByText("1,6 mi seguidores")).toBeVisible();
    expect(screen.getByTestId("company-listing")).toHaveTextContent(
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

  it("lets visitors stop the moving carousel", async () => {
    const user = userEvent.setup();
    render(
      <PublicCommunityProof proof={null} showcase={{ items: [creator] }} />,
    );

    await user.click(screen.getByRole("button", { name: "Pausar carrossel" }));

    expect(
      screen.getByRole("button", { name: "Retomar carrossel" }),
    ).toBeVisible();
  });

  it("holds the space with placeholders until someone is enabled", () => {
    render(<PublicCommunityProof proof={marquee} showcase={{ items: [] }} />);

    expect(screen.getAllByTestId("showcase-placeholder")).toHaveLength(3);
    expect(screen.queryByTestId("creator-listing")).not.toBeInTheDocument();
    expect(screen.getByText("Marca Beta")).toBeVisible();
  });

  it("renders the carousel even when the marquee could not load", () => {
    render(
      <PublicCommunityProof proof={null} showcase={{ items: [company] }} />,
    );

    expect(
      screen.queryByRole("list", { name: "Marcas aprovadas" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("company-listing")).toBeInTheDocument();
  });

  it("renders nothing when neither source could load", () => {
    const { container } = render(
      <PublicCommunityProof proof={null} showcase={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
