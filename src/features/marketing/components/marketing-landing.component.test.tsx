import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarketingLanding } from "@/features/marketing";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void _priority;

    return (
      // The mock verifies the accessible contract without Next.js optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

describe("MarketingLanding", () => {
  it("renders the complete public journey in polished pt-BR", () => {
    render(<MarketingLanding />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Creators e marcas, no mesmo ritmo.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Menos ruído. Mais conexão.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Da inscrição à conexão, sem complicação.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("preserves separate influencer and company registration intents", () => {
    render(<MarketingLanding />);

    expect(
      screen.getAllByRole("link", { name: "Sou influencer" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
    expect(
      screen.getAllByRole("link", { name: "Sou empresa" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=company");
    expect(screen.getAllByRole("link", { name: "Entrar" })[0]).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("uses the supplied brand asset without participant listings", () => {
    render(<MarketingLanding />);

    expect(
      screen.getByRole("img", { name: "Contente Creators" }),
    ).toHaveAttribute("src", "/brand/official/contente-creators-blue.png");
    expect(screen.queryByTestId("creator-listing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("company-listing")).not.toBeInTheDocument();
  });

  it("uses the approved marketing color treatment without emoji symbols", () => {
    const { container } = render(<MarketingLanding />);

    expect(screen.getByTestId("marketing-hero")).toHaveClass(
      "marketing-hero-surface",
    );
    expect(screen.getByTestId("marketing-final-cta")).toHaveClass(
      "marketing-cta-surface",
    );
    expect(container.textContent).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    );
  });

  it("uses purposeful Magic UI motion while keeping the content accessible", () => {
    const { container } = render(<MarketingLanding />);

    expect(
      container.querySelectorAll('[data-slot="text-animate"]').length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      container.querySelector('[data-slot="aurora-text"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId("marketing-motion-strip")).toHaveTextContent(
      "Creators",
    );
    expect(
      container.querySelector('[data-slot="scroll-velocity-container"]'),
    ).toBeInTheDocument();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(<MarketingLanding />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
