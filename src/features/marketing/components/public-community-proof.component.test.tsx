import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PublicCommunityCreatorDto } from "../types/public-community-proof.types";
import { PublicCommunityProof } from "./public-community-proof";

const creator: PublicCommunityCreatorDto = {
  avatar: null,
  bioExcerpt: "Conteudo de beleza e lifestyle para marcas locais.",
  city: "Joacaba",
  creatorId: "creator-1",
  creatorType: "UGC",
  displayName: "Fernanda Souza",
  metric: {
    engagementRate: 3.52,
    followerCount: 1_600_000,
    platform: "INSTAGRAM",
  },
  niches: [{ name: "Beleza", slug: "beleza" }],
  state: "SC",
};

describe("PublicCommunityProof", () => {
  it("renders approved company names and creator summary cards", () => {
    render(
      <PublicCommunityProof
        proof={{
          companies: [
            {
              city: "Sao Paulo",
              companyId: "company-1",
              segment: "Moda",
              state: "SP",
              tradeName: "Marca Beta",
            },
          ],
          creators: [creator],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Creators e marcas em destaque" }),
    ).toBeVisible();
    expect(
      screen.queryByText(
        /Um espaço público para apresentar a força da comunidade/iu,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Marca Beta")).toBeVisible();
    expect(screen.getByText("Fernanda Souza")).toBeVisible();
    expect(screen.getByText("UGC")).toBeVisible();
    expect(screen.getByText("Beleza")).toBeVisible();
    expect(screen.getByText("Joacaba, SC")).toBeVisible();
    expect(screen.getByText("1,6 mi seguidores")).toBeVisible();
    expect(screen.getByText("3,52%")).toBeVisible();
    expect(screen.getByLabelText("Perfil aprovado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sou Empresa" })).toHaveAttribute(
      "href",
      "/sign-up?intent=company",
    );
  });

  it("falls back to initials when a creator has no public photo", () => {
    render(
      <PublicCommunityProof proof={{ companies: [], creators: [creator] }} />,
    );

    expect(screen.getByText("FS")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the signed photo of a curated creator", () => {
    render(
      <PublicCommunityProof
        proof={{
          companies: [],
          creators: [
            {
              ...creator,
              avatar: {
                height: 512,
                url: "https://project.supabase.co/storage/v1/object/sign/a.webp?token=x",
                width: 512,
              },
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Foto de perfil de Fernanda Souza" }),
    ).toHaveAttribute(
      "src",
      "https://project.supabase.co/storage/v1/object/sign/a.webp?token=x",
    );
    expect(screen.queryByText("FS")).not.toBeInTheDocument();
  });

  it("renders nothing when no public proof is available", () => {
    const { container } = render(<PublicCommunityProof proof={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
