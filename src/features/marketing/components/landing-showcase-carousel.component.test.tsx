import { forwardRef, useImperativeHandle } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScrollVelocityRowHandle } from "@/registry/magicui/scroll-based-velocity";

import type { PublicShowcaseCreatorDto } from "../types/public-landing-showcase.types";

const scrollToOffsetSpy = vi.fn();
let capturedPaused: boolean | undefined;

vi.mock("@/registry/magicui/scroll-based-velocity", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/registry/magicui/scroll-based-velocity")
    >();

  const MockScrollVelocityRow = forwardRef<
    ScrollVelocityRowHandle,
    { children: React.ReactNode; paused?: boolean }
  >(function MockScrollVelocityRow({ children, paused }, ref) {
    capturedPaused = paused;
    useImperativeHandle(ref, () => ({ scrollToOffset: scrollToOffsetSpy }));
    return <div data-testid="mock-scroll-velocity-row">{children}</div>;
  });

  return { ...actual, ScrollVelocityRow: MockScrollVelocityRow };
});

const { LandingShowcaseCarousel } = await import(
  "./landing-showcase-carousel.client"
);

function creator(id: string): PublicShowcaseCreatorDto {
  return {
    avatar: null,
    bioExcerpt: null,
    city: null,
    cover: null,
    creatorType: "INFLUENCER",
    displayName: `Creator ${id}`,
    id,
    kind: "CREATOR",
    metric: null,
    niches: [],
    state: null,
  };
}

const items = [creator("1"), creator("2"), creator("3"), creator("4")];

describe("LandingShowcaseCarousel", () => {
  beforeEach(() => {
    capturedPaused = undefined;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 336,
      left: 0,
      right: 280,
      toJSON: () => ({}),
      top: 0,
      width: 280,
      x: 0,
      y: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    scrollToOffsetSpy.mockClear();
  });

  it("has no leftover pause/resume button", () => {
    render(<LandingShowcaseCarousel items={items} />);

    expect(
      screen.queryByRole("button", { name: /pausar carrossel/iu }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /retomar carrossel/iu }),
    ).not.toBeInTheDocument();
  });

  it("renders one dot per item, the first one marked active", () => {
    render(<LandingShowcaseCarousel items={items} />);

    const dots = screen.getByRole("tablist", { name: "Escolher destaque" });
    const tabs = within(dots).getAllByRole("tab");

    expect(tabs).toHaveLength(items.length);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("pauses while the pointer holds it down and resumes on release", () => {
    render(<LandingShowcaseCarousel items={items} />);

    const zone = screen.getByTestId("carousel-interaction-zone");

    expect(capturedPaused).toBe(false);

    fireEvent.pointerDown(zone);
    expect(capturedPaused).toBe(true);

    fireEvent.pointerUp(zone);
    expect(capturedPaused).toBe(false);
  });

  it("pauses on mouse hover and resumes on mouse leave", () => {
    render(<LandingShowcaseCarousel items={items} />);

    const zone = screen.getByTestId("carousel-interaction-zone");

    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    expect(capturedPaused).toBe(true);

    fireEvent.pointerLeave(zone, { pointerType: "mouse" });
    expect(capturedPaused).toBe(false);
  });

  it("scrolls to the target item when a dot is clicked", async () => {
    const user = userEvent.setup();
    render(<LandingShowcaseCarousel items={items} />);

    const dots = screen.getByRole("tablist", { name: "Escolher destaque" });

    await user.click(
      within(dots).getByRole("tab", { name: `Ir para 2 de ${items.length}` }),
    );

    expect(scrollToOffsetSpy).toHaveBeenCalledTimes(1);
    expect(scrollToOffsetSpy).toHaveBeenCalledWith(expect.any(Number));
  });
});
