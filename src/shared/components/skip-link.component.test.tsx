import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  it("targets the page main landmark with concise pt-BR copy", () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Conteúdo principal
        </main>
      </>,
    );

    expect(
      screen.getByRole("link", { name: "Pular para o conteúdo" }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("has no blocking automated accessibility violations", async () => {
    const { container } = render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Conteúdo principal
        </main>
      </>,
    );

    await expect(
      getBlockingComponentAccessibilityViolations(container),
    ).resolves.toEqual([]);
  });
});
