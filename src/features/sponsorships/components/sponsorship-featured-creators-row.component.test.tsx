import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { SponsorshipFeaturedCreatorItem } from "./sponsorship-featured-creator-card";
import {
  FEATURED_ROTATION_INTERVAL_MS,
  SponsorshipFeaturedCreatorsRow,
} from "./sponsorship-featured-creators-row.client";

const layout = { clientWidth: 0, scrollLeft: 0, scrollWidth: 0 };
const resizeCallbacks: Array<() => void> = [];
const disconnect = vi.fn();
const scrollTo = vi.fn((options: ScrollToOptions) => {
  layout.scrollLeft = options.left ?? 0;
});

class TestResizeObserver {
  disconnect = disconnect;
  observe = vi.fn();
  unobserve = vi.fn();

  constructor(callback: () => void) {
    resizeCallbacks.push(callback);
  }
}

const originalMatchMedia = window.matchMedia;
const originalResizeObserver = globalThis.ResizeObserver;

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches: matches && query.includes("prefers-reduced-motion"),
      media: query,
      removeEventListener: vi.fn(),
    })),
  );
}

function items(count: number): SponsorshipFeaturedCreatorItem[] {
  return Array.from({ length: count }, (_, index) => ({
    creative: {
      audienceMatches: true,
      eligible: true,
      id: `10000000-0000-4000-8000-0000000002${String(index).padStart(2, "0")}`,
      routeMatches: true,
      showSponsoredBadge: true,
      title: `Destaque ${index + 1}`,
    },
    creator: {
      creatorTypeLabel: "Creator",
      detailHref: `/app/creators/10000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`,
      displayName: `Creator ${index + 1}`,
      eligible: true,
      media: null,
    },
  }));
}

/** Five cards 116 px apart in a row showing four of them. */
function overflowingLayout() {
  layout.scrollWidth = 580;
  layout.clientWidth = 448;
}

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function lastScrollLeft() {
  return scrollTo.mock.calls.at(-1)?.[0]?.left;
}

describe("SponsorshipFeaturedCreatorsRow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    layout.clientWidth = 0;
    layout.scrollLeft = 0;
    layout.scrollWidth = 0;
    resizeCallbacks.length = 0;
    stubReducedMotion(false);
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { configurable: true, get: () => layout.clientWidth },
      scrollLeft: {
        configurable: true,
        get: () => layout.scrollLeft,
        set: (value: number) => {
          layout.scrollLeft = value;
        },
      },
      scrollTo: { configurable: true, value: scrollTo, writable: true },
      scrollWidth: { configurable: true, get: () => layout.scrollWidth },
    });
  });

  afterEach(() => {
    for (const property of [
      "clientWidth",
      "scrollLeft",
      "scrollTo",
      "scrollWidth",
    ]) {
      Reflect.deleteProperty(HTMLElement.prototype, property);
    }
    scrollTo.mockClear();
    disconnect.mockClear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", originalMatchMedia);
    vi.stubGlobal("ResizeObserver", originalResizeObserver);
  });

  it("renders the creators side by side as a list of cards", () => {
    render(<SponsorshipFeaturedCreatorsRow items={items(3)} />);

    const region = screen.getByRole("region", {
      name: "Criadores em destaque",
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getAllByRole("link", { name: /Ver perfil de Creator/ }),
    ).toHaveLength(3);
    expect(region).toHaveAttribute("data-overflowing", "false");
  });

  it("stays static, with no indicators and no motion, while the cards fit", () => {
    layout.scrollWidth = 448;
    layout.clientWidth = 448;
    render(<SponsorshipFeaturedCreatorsRow items={items(3)} />);

    tick(60_000);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: "Criadores em destaque" }),
    ).not.toHaveAttribute("aria-roledescription");
    expect(screen.queryByRole("group", { name: /Escolher/ })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("detects overflow, exposes carousel controls and advances every 5 seconds, wrapping at the end", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    expect(FEATURED_ROTATION_INTERVAL_MS).toBe(5_000);
    expect(
      screen.getByRole("region", { name: "Criadores em destaque" }),
    ).toHaveAttribute("aria-roledescription", "carrossel");
    // Five cards with four in view: three resting positions.
    expect(
      screen.getAllByRole("button", { name: /Ir para a posição/ }),
    ).toHaveLength(3);
    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 1 de 3 dos criadores em destaque",
      }),
    ).toHaveAttribute("aria-current", "true");

    tick(4_999);
    expect(scrollTo).not.toHaveBeenCalled();
    tick(1);
    expect(lastScrollLeft()).toBe(116);
    tick(5_000);
    // The last stop is clamped to the end of the row.
    expect(lastScrollLeft()).toBe(132);
    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 3 de 3 dos criadores em destaque",
      }),
    ).toHaveAttribute("aria-current", "true");
    tick(5_000);
    expect(lastScrollLeft()).toBe(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "smooth", left: 0 });
  });

  it("starts advancing once a resize makes the row overflow, and stops when it fits again", () => {
    layout.scrollWidth = 448;
    layout.clientWidth = 448;
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    expect(screen.queryByRole("group", { name: /Escolher/ })).toBeNull();

    overflowingLayout();
    act(() => resizeCallbacks.forEach((callback) => callback()));
    expect(screen.getByRole("group", { name: /Escolher/ })).toBeVisible();
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);

    layout.scrollWidth = 448;
    act(() => resizeCallbacks.forEach((callback) => callback()));
    expect(screen.queryByRole("group", { name: /Escolher/ })).toBeNull();
  });

  it("pauses on hover and resumes when the pointer leaves", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);
    const region = screen.getByRole("region", {
      name: "Criadores em destaque",
    });

    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    tick(30_000);
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.pointerLeave(region, { pointerType: "mouse" });
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);
  });

  it("pauses while a touch is pressed and held, and resumes on release", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);
    const region = screen.getByRole("region", {
      name: "Criadores em destaque",
    });

    fireEvent.pointerDown(region, { pointerType: "touch" });
    tick(30_000);
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.pointerUp(region, { pointerType: "touch" });
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);
  });

  it("does not treat a touch pointerenter as hover", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    fireEvent.pointerEnter(
      screen.getByRole("region", { name: "Criadores em destaque" }),
      { pointerType: "touch" },
    );
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);
  });

  it("pauses while keyboard focus is inside the row", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);
    const link = screen.getAllByRole("link", { name: /Ver perfil de/ })[0];
    const matches = Element.prototype.matches;

    vi.spyOn(Element.prototype, "matches").mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ":focus-visible" || matches.call(this, selector);
    });
    fireEvent.focusIn(link);
    tick(30_000);
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.focusOut(link, { relatedTarget: document.body });
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);
  });

  it("jumps to a position from its indicator", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos criadores em destaque",
      }),
    );
    expect(lastScrollLeft()).toBe(116);
  });

  it("follows a manual scroll once it settles", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);
    const list = screen.getByRole("list");

    layout.scrollLeft = 116;
    fireEvent.scroll(list);
    tick(149);
    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 1 de 3 dos criadores em destaque",
      }),
    ).toHaveAttribute("aria-current", "true");
    tick(1);
    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos criadores em destaque",
      }),
    ).toHaveAttribute("aria-current", "true");
    // Already where the visitor left it: no corrective scrolling.
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("never advances with reduced motion, keeps the indicators and scrolls without animation", () => {
    stubReducedMotion(true);
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Pausar|Retomar/ }),
    ).not.toBeInTheDocument();
    // Still manually scrollable: the list is a plain overflow container.
    expect(screen.getByRole("list")).toHaveClass("overflow-x-auto");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos criadores em destaque",
      }),
    );
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 116 });
  });

  it("overlays only the dots, after the cards and without arrows", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    const list = screen.getByRole("list");
    const controls = screen
      .getByRole("group", { name: "Escolher criador em destaque" })
      .closest("[data-slot='sponsorship-carousel-controls']") as HTMLElement;

    expect(list.compareDocumentPosition(controls)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(list).not.toContainElement(controls);
    expect(
      within(controls)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "Ir para a posição 1 de 3 dos criadores em destaque",
      "Ir para a posição 2 de 3 dos criadores em destaque",
      "Ir para a posição 3 de 3 dos criadores em destaque",
    ]);
  });

  it("moves with the dots and the keyboard arrows", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos criadores em destaque",
      }),
    );
    expect(lastScrollLeft()).toBe(116);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 3 de 3 dos criadores em destaque",
      }),
    );
    expect(lastScrollLeft()).toBe(132);

    fireEvent.keyDown(screen.getAllByRole("link")[0], { key: "ArrowRight" });
    expect(lastScrollLeft()).toBe(0);
    fireEvent.keyDown(screen.getAllByRole("link")[0], { key: "ArrowLeft" });
    expect(lastScrollLeft()).toBe(132);
  });

  it("keeps dots with reduced motion and never shows a pause button", () => {
    stubReducedMotion(true);
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(5)} />);

    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos criadores em destaque",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Pausar|Retomar/ }),
    ).not.toBeInTheDocument();
    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("renders a single creator without dots, arrows or autoplay", () => {
    overflowingLayout();
    render(<SponsorshipFeaturedCreatorsRow items={items(1)} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders nothing when no creator is eligible", () => {
    const hidden = items(2).map((item) => ({
      ...item,
      creator: { ...item.creator, eligible: false },
    }));
    const { container } = render(
      <SponsorshipFeaturedCreatorsRow items={hidden} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("releases its observer and timers when unmounted", () => {
    overflowingLayout();
    const { unmount } = render(
      <SponsorshipFeaturedCreatorsRow items={items(5)} />,
    );

    fireEvent.scroll(screen.getByRole("list"));
    unmount();

    expect(disconnect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("has no blocking accessibility violations", async () => {
    vi.useRealTimers();
    overflowingLayout();
    const { container } = render(
      <SponsorshipFeaturedCreatorsRow items={items(5)} />,
    );

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
