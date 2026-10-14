import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoAdvance } from "./use-auto-advance";

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

function stubFocusVisible(visible: boolean) {
  const matches = Element.prototype.matches;

  vi.spyOn(Element.prototype, "matches").mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    return selector === ":focus-visible"
      ? visible
      : matches.call(this, selector);
  });
}

function setDocumentVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function Harness({
  count = 3,
  enabled,
}: {
  count?: number;
  enabled?: boolean;
}) {
  const advance = useAutoAdvance({ count, enabled, intervalMs: 1_000 });

  return (
    <div data-testid="zone" {...advance.interactionProps}>
      <output data-testid="index">{advance.activeIndex}</output>
      <output data-testid="playing">{String(advance.isPlaying)}</output>
      <output data-testid="can-autoplay">{String(advance.canAutoplay)}</output>
      <button onClick={advance.togglePaused} type="button">
        toggle
      </button>
      <button onClick={() => advance.goTo(2)} type="button">
        go-2
      </button>
      <button onClick={advance.next} type="button">
        next
      </button>
      <button onClick={advance.previous} type="button">
        previous
      </button>
    </div>
  );
}

const index = () => screen.getByTestId("index").textContent;

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useAutoAdvance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
    setDocumentVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", originalMatchMedia);
    vi.stubGlobal("ResizeObserver", originalResizeObserver);
  });

  it("advances on every interval and wraps to the first slide", () => {
    render(<Harness />);

    expect(index()).toBe("0");
    tick(1_000);
    expect(index()).toBe("1");
    tick(1_000);
    expect(index()).toBe("2");
    tick(1_000);
    expect(index()).toBe("0");
  });

  it("restarts the interval after a manual jump", () => {
    render(<Harness />);

    tick(900);
    fireEvent.click(screen.getByRole("button", { name: "go-2" }));
    expect(index()).toBe("2");
    tick(900);
    expect(index()).toBe("2");
    tick(100);
    expect(index()).toBe("0");
  });

  it("moves with next and previous, wrapping at both ends", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "previous" }));
    expect(index()).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "next" }));
    expect(index()).toBe("0");
  });

  it("holds while the pointer is over the region and resumes after it leaves", () => {
    render(<Harness />);
    const zone = screen.getByTestId("zone");

    fireEvent.pointerEnter(zone);
    tick(5_000);
    expect(index()).toBe("0");
    expect(screen.getByTestId("playing")).toHaveTextContent("false");

    fireEvent.pointerLeave(zone);
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("does not treat a touch contact as hover", () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByTestId("zone"), {
      pointerType: "touch",
    });
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("holds while keyboard focus is inside the region and resumes once it leaves", () => {
    stubFocusVisible(true);
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "toggle" });

    fireEvent.focusIn(toggle);
    tick(5_000);
    expect(index()).toBe("0");

    fireEvent.focusOut(toggle, { relatedTarget: document.body });
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("keeps holding when focus moves between controls of the region", () => {
    stubFocusVisible(true);
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "toggle" });
    const goTo = screen.getByRole("button", { name: "go-2" });

    fireEvent.focusIn(toggle);
    fireEvent.focusOut(toggle, { relatedTarget: goTo });
    fireEvent.focusIn(goTo);
    tick(3_000);
    expect(index()).toBe("0");
  });

  it("does not hold for the focus a mouse click leaves on a control", () => {
    stubFocusVisible(false);
    render(<Harness />);

    fireEvent.focusIn(screen.getByRole("button", { name: "toggle" }));
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("holds while the tab is hidden", () => {
    render(<Harness />);

    act(() => setDocumentVisibility("hidden"));
    tick(5_000);
    expect(index()).toBe("0");

    act(() => setDocumentVisibility("visible"));
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("pauses and resumes on demand", () => {
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "toggle" });

    fireEvent.click(toggle);
    tick(5_000);
    expect(index()).toBe("0");

    fireEvent.click(toggle);
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("lets an explicit resume win over the pointer resting on the controls", () => {
    render(<Harness />);
    const zone = screen.getByTestId("zone");
    const toggle = screen.getByRole("button", { name: "toggle" });

    fireEvent.click(toggle);
    fireEvent.pointerEnter(zone);
    fireEvent.click(toggle);
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("never autoplays with prefers-reduced-motion, but still navigates manually", () => {
    stubReducedMotion(true);
    render(<Harness />);

    expect(screen.getByTestId("can-autoplay")).toHaveTextContent("false");
    tick(10_000);
    expect(index()).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "next" }));
    expect(index()).toBe("1");
  });

  it("does not autoplay a single slide or when disabled", () => {
    const { rerender } = render(<Harness count={1} />);

    tick(5_000);
    expect(index()).toBe("0");

    rerender(<Harness enabled={false} />);
    tick(5_000);
    expect(index()).toBe("0");

    rerender(<Harness enabled />);
    tick(1_000);
    expect(index()).toBe("1");
  });

  it("clamps the index when the slide count shrinks and clears its timer on unmount", () => {
    const { rerender, unmount } = render(<Harness count={3} />);

    fireEvent.click(screen.getByRole("button", { name: "go-2" }));
    rerender(<Harness count={2} />);
    expect(index()).toBe("1");

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
