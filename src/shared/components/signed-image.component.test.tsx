import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignedImage } from "./signed-image";

describe("SignedImage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the fallback mark once the image errors", () => {
    render(
      <SignedImage
        alt="Capa"
        className="object-cover"
        fallback={<div data-testid="fallback">sem capa</div>}
        loading="eager"
        src="https://example.com/broken.webp"
      />,
    );

    fireEvent.error(screen.getByAltText("Capa"));

    expect(screen.getByTestId("fallback")).toBeVisible();
  });

  it("does not render the fallback while still loading or once loaded", () => {
    render(
      <SignedImage
        alt="Capa"
        className="object-cover"
        fallback={<div data-testid="fallback">sem capa</div>}
        loading="eager"
        src="https://example.com/ok.webp"
      />,
    );

    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();

    fireEvent.load(screen.getByAltText("Capa"));

    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
  });

  it("falls back on its own after 8s when the image never fires load or error", () => {
    vi.useFakeTimers();

    render(
      <SignedImage
        alt="Capa"
        className="object-cover"
        fallback={<div data-testid="fallback">sem capa</div>}
        loading="eager"
        src="https://example.com/stuck.webp"
      />,
    );

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(screen.getByTestId("fallback")).toBeVisible();
  });

  describe("with no wrapperClassName", () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it("still renders the fallback over an already-positioned parent", () => {
      render(
        <div style={{ position: "relative" }}>
          <SignedImage
            alt="Logo"
            className="size-full object-cover"
            fallback={<div data-testid="fallback">sem logo</div>}
            loading="eager"
            src="https://example.com/broken-logo.webp"
          />
        </div>,
      );

      fireEvent.error(screen.getByAltText("Logo"));

      expect(screen.getByTestId("fallback")).toBeVisible();
    });
  });
});
