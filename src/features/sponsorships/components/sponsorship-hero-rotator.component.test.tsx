import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HERO_ROTATION_INTERVAL_MS,
  SponsorshipHeroRotator,
} from "./sponsorship-hero-rotator.client";
import type { SponsorshipCreativeViewModel } from "./sponsorship-presentation";

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

function creative(index: number): SponsorshipCreativeViewModel {
  return {
    audienceMatches: true,
    eligible: true,
    id: `50000000-0000-4000-8000-00000000000${index}`,
    link: null,
    media: {
      alt: `Imagem do banner ${index}`,
      url: `https://storage.example.test/banner-${index}`,
    },
    routeMatches: true,
    showSponsoredBadge: false,
    title: `Campanha ${index}`,
  };
}

const banners = (count: number) =>
  Array.from({ length: count }, (_, index) => creative(index + 1));

function visibleTitle() {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
}

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("SponsorshipHeroRotator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", originalMatchMedia);
    vi.stubGlobal("ResizeObserver", originalResizeObserver);
  });

  it("exposes an accessible carousel with one indicator per banner", () => {
    render(<SponsorshipHeroRotator creatives={banners(2)} />);

    const region = screen.getByRole("region", { name: "Banners patrocinados" });

    expect(region).toHaveAttribute("aria-roledescription", "carrossel");
    expect(
      screen.getByRole("button", { name: "Ir para o banner 1 de 2" }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: "Ir para o banner 2 de 2" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.queryByRole("button", { name: /Pausar|Retomar/ }),
    ).not.toBeInTheDocument();
  });

  it("shows only the active banner to assistive technology and the tab order", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    // Only the active slide is exposed; the others are aria-hidden and inert.
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    const slides = screen.getByTestId("hero-rotator-slides").children;

    expect(slides).toHaveLength(3);
    expect(slides[0]).not.toHaveAttribute("inert");
    expect(slides[1]).toHaveAttribute("inert");
    expect(slides[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("advances every 5 seconds and wraps from the last banner to the first", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    expect(HERO_ROTATION_INTERVAL_MS).toBe(5_000);
    tick(4_999);
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    tick(1);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 3"]);
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    expect(
      screen.getByRole("button", { name: "Ir para o banner 1 de 3" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("lazy-loads every image but the first", () => {
    const { container } = render(
      <SponsorshipHeroRotator creatives={banners(3)} />,
    );
    const images = [...container.querySelectorAll("img")];

    expect(images.map((image) => image.getAttribute("loading"))).toEqual([
      "eager",
      "lazy",
      "lazy",
    ]);
  });

  it("jumps to a banner from its indicator and restarts the interval", () => {
    render(<SponsorshipHeroRotator creatives={banners(5)} />);

    tick(4_000);
    fireEvent.click(
      screen.getByRole("button", { name: "Ir para o banner 4 de 5" }),
    );
    expect(visibleTitle()).toEqual(["Campanha 4"]);
    tick(4_999);
    expect(visibleTitle()).toEqual(["Campanha 4"]);
    tick(1);
    expect(visibleTitle()).toEqual(["Campanha 5"]);
  });

  it("pauses on pointer hover and resumes when the pointer leaves", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);
    const region = screen.getByRole("region", { name: "Banners patrocinados" });

    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    tick(30_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);

    fireEvent.pointerLeave(region, { pointerType: "mouse" });
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("pauses while a touch is pressed and held, and resumes on release", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);
    const region = screen.getByRole("region", { name: "Banners patrocinados" });

    fireEvent.pointerDown(region, { pointerType: "touch" });
    tick(30_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);

    fireEvent.pointerUp(region, { pointerType: "touch" });
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("does not treat a touch pointerenter as hover", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);
    const region = screen.getByRole("region", { name: "Banners patrocinados" });

    fireEvent.pointerEnter(region, { pointerType: "touch" });
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("pauses while an element inside has focus", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);
    const indicator = screen.getByRole("button", {
      name: "Ir para o banner 3 de 3",
    });
    const matches = Element.prototype.matches;

    vi.spyOn(Element.prototype, "matches").mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ":focus-visible" || matches.call(this, selector);
    });
    fireEvent.focusIn(indicator);
    tick(30_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);

    fireEvent.focusOut(indicator, { relatedTarget: document.body });
    tick(5_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("announces changes politely only while it is not auto-rotating", () => {
    render(<SponsorshipHeroRotator creatives={banners(2)} />);
    const slides = screen.getByTestId("hero-rotator-slides");

    expect(slides).toHaveAttribute("aria-live", "off");
    fireEvent.pointerEnter(
      screen.getByRole("region", { name: "Banners patrocinados" }),
      { pointerType: "mouse" },
    );
    expect(slides).toHaveAttribute("aria-live", "polite");
  });

  it("does not rotate and changes only by indicator with reduced motion", () => {
    stubReducedMotion(true);
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    tick(60_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    expect(
      screen.queryByRole("button", { name: /Pausar|Retomar/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ir para o banner 2 de 3" }),
    );
    expect(visibleTitle()).toEqual(["Campanha 2"]);
    tick(60_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("places the controls after the slides, with arrows around the dots", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    const slides = screen.getByTestId("hero-rotator-slides");
    const controls = screen
      .getByRole("group", { name: "Escolher banner" })
      .closest("[data-slot='sponsorship-carousel-controls']");

    expect(controls).not.toBeNull();
    expect(slides.compareDocumentPosition(controls!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(slides).not.toContainElement(controls as HTMLElement);

    const names = within(controls as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(names).toEqual([
      "Ir para o banner 1 de 3",
      "Ir para o banner 2 de 3",
      "Ir para o banner 3 de 3",
    ]);
  });

  it("has no arrow buttons, only dots", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    expect(
      screen.queryByRole("button", { name: "Banner anterior" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Próximo banner" }),
    ).not.toBeInTheDocument();
  });

  it("jumps to a banner with its dot", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ir para o banner 3 de 3" }),
    );
    expect(visibleTitle()).toEqual(["Campanha 3"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Ir para o banner 1 de 3" }),
    );
    expect(visibleTitle()).toEqual(["Campanha 1"]);
  });

  it("moves with the keyboard arrows while focus is inside the carousel", () => {
    render(<SponsorshipHeroRotator creatives={banners(3)} />);
    const indicator = screen.getByRole("button", {
      name: "Ir para o banner 1 de 3",
    });

    fireEvent.keyDown(indicator, { key: "ArrowRight" });
    expect(visibleTitle()).toEqual(["Campanha 2"]);
    fireEvent.keyDown(indicator, { key: "ArrowLeft" });
    expect(visibleTitle()).toEqual(["Campanha 1"]);
  });

  it("keeps dots working with reduced motion", () => {
    stubReducedMotion(true);
    render(<SponsorshipHeroRotator creatives={banners(3)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ir para o banner 2 de 3" }),
    );
    expect(visibleTitle()).toEqual(["Campanha 2"]);
    tick(60_000);
    expect(visibleTitle()).toEqual(["Campanha 2"]);
  });

  it("renders a single banner without dots, arrows or autoplay", () => {
    render(<SponsorshipHeroRotator creatives={banners(1)} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Banners patrocinados" }),
    ).not.toBeInTheDocument();
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    tick(60_000);
    expect(visibleTitle()).toEqual(["Campanha 1"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer when unmounted", () => {
    const { unmount } = render(
      <SponsorshipHeroRotator creatives={banners(2)} />,
    );

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
