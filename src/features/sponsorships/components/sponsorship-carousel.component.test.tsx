import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { SponsorshipCarousel } from "./sponsorship-carousel.client";
import type { SponsorshipCreativeViewModel } from "./sponsorship-presentation";

const layout = { clientWidth: 0, scrollLeft: 0, scrollWidth: 0 };
const disconnect = vi.fn();
const scrollTo = vi.fn((options: ScrollToOptions) => {
  layout.scrollLeft = options.left ?? 0;
});

class TestResizeObserver {
  disconnect = disconnect;
  observe = vi.fn();
  unobserve = vi.fn();
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

function creatives(count: number): SponsorshipCreativeViewModel[] {
  return Array.from({ length: count }, (_, index) => ({
    audienceMatches: true,
    body: "Uma oportunidade preparada para a comunidade.",
    eligible: true,
    id: `10000000-0000-4000-8000-0000000003${String(index).padStart(2, "0")}`,
    link: {
      buttonLabel: `Conhecer oportunidade ${index + 1}`,
      href: `https://example.test/oportunidade-${index + 1}`,
      onCreative: false,
    },
    routeMatches: true,
    title: `Patrocínio ${index + 1}`,
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

describe("SponsorshipCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    layout.clientWidth = 0;
    layout.scrollLeft = 0;
    layout.scrollWidth = 0;
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

  it("exposes an accessible carousel and skips creatives that are not eligible", () => {
    overflowingLayout();
    render(
      <SponsorshipCarousel
        creatives={[
          ...creatives(5),
          { ...creatives(6)[5], eligible: false, title: "Não deve aparecer" },
        ]}
        label="Oportunidades em destaque"
      />,
    );

    expect(
      screen.getByRole("region", { name: "Oportunidades em destaque" }),
    ).toHaveAttribute("aria-roledescription", "carrossel");
    expect(screen.queryByText("Não deve aparecer")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("list")).toHaveClass("overflow-x-auto");
  });

  it("advances one card every 5 seconds and wraps at the end", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);

    tick(4_999);
    expect(scrollTo).not.toHaveBeenCalled();
    tick(1);
    expect(lastScrollLeft()).toBe(116);
    tick(5_000);
    expect(lastScrollLeft()).toBe(132);
    tick(5_000);
    expect(lastScrollLeft()).toBe(0);
  });

  it("overlays only the dots, after the cards and without arrows", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);

    const list = screen.getByRole("list");
    const controls = screen
      .getByRole("group", { name: "Escolher patrocínio" })
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
      "Ir para a posição 1 de 3 dos patrocínios",
      "Ir para a posição 2 de 3 dos patrocínios",
      "Ir para a posição 3 de 3 dos patrocínios",
    ]);
    expect(
      screen.getByRole("button", {
        name: "Ir para a posição 1 de 3 dos patrocínios",
      }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("moves with the dots and the keyboard arrows", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);
    const region = screen.getByRole("region", {
      name: "Patrocínios em destaque",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos patrocínios",
      }),
    );
    expect(lastScrollLeft()).toBe(116);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 1 de 3 dos patrocínios",
      }),
    );
    expect(lastScrollLeft()).toBe(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 3 de 3 dos patrocínios",
      }),
    );
    expect(lastScrollLeft()).toBe(132);

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(lastScrollLeft()).toBe(0);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(lastScrollLeft()).toBe(132);
  });

  it("pauses on hover and resumes when the pointer leaves", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);
    const region = screen.getByRole("region", {
      name: "Patrocínios em destaque",
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
    render(<SponsorshipCarousel creatives={creatives(5)} />);
    const region = screen.getByRole("region", {
      name: "Patrocínios em destaque",
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
    render(<SponsorshipCarousel creatives={creatives(5)} />);

    fireEvent.pointerEnter(
      screen.getByRole("region", { name: "Patrocínios em destaque" }),
      { pointerType: "touch" },
    );
    tick(5_000);
    expect(lastScrollLeft()).toBe(116);
  });

  it("pauses while keyboard focus is inside and resumes once it leaves", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);
    const link = screen.getAllByRole("link")[0];
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

  it("does not autoplay with reduced motion but stays navigable", () => {
    stubReducedMotion(true);
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(5)} />);

    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Pausar|Retomar/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ir para a posição 2 de 3 dos patrocínios",
      }),
    );
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: "auto", left: 116 });
  });

  it("renders one card without dots, arrows or autoplay", () => {
    overflowingLayout();
    render(<SponsorshipCarousel creatives={creatives(1)} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /patrocínio|Pausar|Retomar/i }),
    ).not.toBeInTheDocument();
    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stays static while every card fits", () => {
    layout.scrollWidth = 448;
    layout.clientWidth = 448;
    render(<SponsorshipCarousel creatives={creatives(3)} />);

    tick(60_000);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders nothing without eligible creatives", () => {
    const { container } = render(
      <SponsorshipCarousel
        creatives={creatives(2).map((item) => ({ ...item, eligible: false }))}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("releases its observer and timers when unmounted", () => {
    overflowingLayout();
    const { unmount } = render(
      <SponsorshipCarousel creatives={creatives(5)} />,
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
      <SponsorshipCarousel creatives={creatives(5)} />,
    );

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
