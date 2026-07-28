import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createPublicAggregateCountersSlot } from "./public-aggregate-counters-slot";

describe("public aggregate counters server slot", () => {
  it("waits for a request before loading bounded counters", async () => {
    const load = vi.fn(async () => ({ approvedCreators: 14 }));
    const waitForRequest = vi.fn(async () => undefined);
    const Slot = createPublicAggregateCountersSlot({
      load,
      waitForRequest,
    });

    render(await Slot());

    expect(screen.getByText("14")).toBeVisible();
    expect(screen.getByText("Creators aprovados")).toBeVisible();
    expect(waitForRequest).toHaveBeenCalledOnce();
    expect(waitForRequest.mock.invocationCallOrder[0]).toBeLessThan(
      load.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("renders nothing when no meaningful aggregate exists", async () => {
    const Slot = createPublicAggregateCountersSlot({
      load: vi.fn(async () => null),
      waitForRequest: vi.fn(async () => undefined),
    });

    const { container } = render(await Slot());

    expect(container).toBeEmptyDOMElement();
  });
});
