import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BrandLogo } from "./brand-logo";

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    preload: _preload,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { preload?: boolean }) => {
    void _preload;

    return (
      // The mock verifies the accessible contract without Next.js optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

const expectedSources = {
  black: "/brand/official/contente-creators-black.png",
  blue: "/brand/official/contente-creators-blue.png",
  lime: "/brand/official/contente-creators-lime.png",
  pink: "/brand/official/contente-creators-pink.png",
  "royal-blue": "/brand/official/contente-creators-royal-blue.png",
  white: "/brand/official/contente-creators-white.png",
} as const;

describe("BrandLogo", () => {
  it("uses the official blue artwork by default and preserves custom sizing", () => {
    render(<BrandLogo className="h-20 w-60" />);

    const image = screen.getByRole("img", { name: "Contente Creators" });
    const container = image.parentElement;

    expect(image).toHaveAttribute("src", expectedSources.blue);
    expect(image).toHaveAttribute("data-brand-delivery", "direct");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(container).toHaveAttribute("data-brand-variant", "blue");
    expect(container).toHaveAttribute("data-brand-background", "transparent");
    expect(container).toHaveClass("h-20", "w-60");
  });

  it("eagerly delivers a preloaded logo without the Next.js image optimizer", () => {
    render(<BrandLogo preload />);

    const image = screen.getByRole("img", { name: "Contente Creators" });

    expect(image).toHaveAttribute("src", expectedSources.blue);
    expect(image).toHaveAttribute("data-brand-delivery", "direct");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("loading", "eager");
  });

  it.each(Object.entries(expectedSources))(
    "maps the %s variant to its untouched official file",
    (variant, source) => {
      render(
        <BrandLogo
          variant={variant as keyof typeof expectedSources}
          background="transparent"
        />,
      );

      expect(
        screen.getByRole("img", { name: "Contente Creators" }),
      ).toHaveAttribute("src", source);
    },
  );

  it.each([
    ["black", "light", "bg-white"],
    ["white", "dark", "bg-brand-night"],
  ] as const)(
    "gives the %s variant a contrasting %s automatic background",
    (variant, background, backgroundClass) => {
      render(<BrandLogo variant={variant} />);

      const image = screen.getByRole("img", { name: "Contente Creators" });
      const container = image.parentElement;

      expect(container).toHaveAttribute("data-brand-background", background);
      expect(container).toHaveClass(backgroundClass);
    },
  );

  it("allows an explicit semantic background without recoloring the artwork", () => {
    render(<BrandLogo background="light" variant="black" />);

    const image = screen.getByRole("img", { name: "Contente Creators" });
    const container = image.parentElement;

    expect(container).toHaveAttribute("data-brand-background", "light");
    expect(container).toHaveClass("bg-white");
    expect(image.className).not.toMatch(/filter|invert|hue/);
  });
});
