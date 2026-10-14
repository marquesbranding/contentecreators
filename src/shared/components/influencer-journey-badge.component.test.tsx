import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InfluencerJourneyBadge } from "./influencer-journey-badge";

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // The mock checks the accessible contract without Next.js optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe("InfluencerJourneyBadge", () => {
  it("renders the Journey logo with the pt-BR alt text", () => {
    render(<InfluencerJourneyBadge />);

    const logo = screen.getByRole("img", { name: "Jornada do Influenciador" });

    expect(logo).toHaveAttribute(
      "src",
      "/brand/partners/jornada-do-influenciador.png",
    );
    expect(logo).toHaveAttribute("width", "1685");
    expect(logo).toHaveAttribute("height", "403");
    expect(logo).toHaveClass("h-5");
  });

  it("uses the larger size on detail views", () => {
    render(<InfluencerJourneyBadge size="md" />);

    expect(
      screen.getByRole("img", { name: "Jornada do Influenciador" }),
    ).toHaveClass("h-6");
  });

  it("keeps a light pill so the blue wordmark stays readable", () => {
    render(<InfluencerJourneyBadge />);

    const pill = screen.getByTitle("Participante da Jornada do Influenciador");

    expect(pill).toHaveClass("bg-white");
  });
});
