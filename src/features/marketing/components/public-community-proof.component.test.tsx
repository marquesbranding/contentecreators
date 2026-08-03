import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicCommunityProof } from "./public-community-proof";

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
          creators: [
            {
              bioExcerpt: "Conteudo de beleza e lifestyle para marcas locais.",
              city: "Joacaba",
              creatorId: "creator-1",
              creatorType: "UGC",
              displayName: "Fernanda",
              metric: {
                engagementRate: 3.52,
                followerCount: 1_600_000,
                platform: "INSTAGRAM",
              },
              niches: [{ name: "Beleza", slug: "beleza" }],
              state: "SC",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Creators e marcas em destaque" }),
    ).toBeVisible();
    expect(screen.getByText("Marca Beta")).toBeVisible();
    expect(screen.getByText("Fernanda")).toBeVisible();
    expect(screen.getByText("Criador UGC")).toBeVisible();
    expect(screen.getByText("Beleza")).toBeVisible();
    expect(
      screen.getByText(/Instagram · informado pelo creator/iu),
    ).toBeVisible();
  });

  it("renders nothing when no public proof is available", () => {
    const { container } = render(<PublicCommunityProof proof={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
