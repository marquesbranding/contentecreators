import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfluencerJourneyNote } from "./influencer-journey-note";

describe("InfluencerJourneyNote", () => {
  it("explains the initiative with the asterisk prefix", () => {
    render(<InfluencerJourneyNote />);

    expect(
      screen.getByText(/^\* A Jornada do Influenciador é uma iniciativa/u),
    ).toBeVisible();
  });

  it("links to the Journey site in a new tab with safe rel", () => {
    render(<InfluencerJourneyNote />);

    const link = screen.getByRole("link", {
      name: "www.jornadadoinfluenciador.com.br",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://www.jornadadoinfluenciador.com.br",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
