import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RendererPlacementDto } from "../../types/sponsorship-placement.types";
import { createPublicSponsorshipPromotionSlot } from "./public-sponsorship-promotion-slot";

const now = new Date("2026-08-01T12:00:00.000Z");
const promotion: RendererPlacementDto = {
  body: "Promoção genérica.",
  eligible: true,
  featuredCreator: null,
  id: "50000000-0000-4000-8000-000000000001",
  linkLabel: null,
  linkUrl: null,
  media: {
    alt: "Campanha genérica",
    url: "https://storage.example.test/signed-promotion",
  },
  sortOrder: 10,
  title: "Conteúdo patrocinado",
  type: "TOP_BANNER",
};

describe("public sponsorship promotion server slot", () => {
  it("composes the public loader with a presentation-only component", async () => {
    const load = vi.fn(async () => [promotion]);
    const waitForRequest = vi.fn(async () => undefined);
    const Slot = createPublicSponsorshipPromotionSlot({
      createDelivery: () => ({ load }),
      now: () => now,
      waitForRequest,
    });

    render(await Slot());

    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Conteúdo patrocinado",
      }),
    ).toBeVisible();
    expect(load).toHaveBeenCalledExactlyOnceWith({
      allowedPlacementTypes: ["TOP_BANNER"],
      limit: 1,
      now,
      route: "PUBLIC_LANDING",
      slotKey: "landing-top",
      viewer: "PUBLIC",
    });
    expect(waitForRequest).toHaveBeenCalledOnce();
    expect(waitForRequest.mock.invocationCallOrder[0]).toBeLessThan(
      load.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("renders nothing when the optional delivery is unavailable", async () => {
    const Slot = createPublicSponsorshipPromotionSlot({
      createDelivery: () => ({
        load: vi.fn(async () => {
          throw new Error("unavailable");
        }),
      }),
      now: () => now,
      waitForRequest: vi.fn(async () => undefined),
    });

    const { container } = render(await Slot());

    expect(container).toBeEmptyDOMElement();
  });
});
