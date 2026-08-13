import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home, { dynamic } from "@/app/page";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void _priority;

    return (
      // The mock verifies the accessible contract without Next.js optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

vi.mock("@/features/marketing/server", () => ({
  loadPublicSupportContact: () => "privacidade@contentecreators.test",
}));

vi.mock("@/features/sponsorships/server", () => ({
  PublicSponsorshipPromotionSlot: () => {
    throw new Error("The static landing must not query sponsorships");
  },
}));

describe("Home", () => {
  it("keeps the static shell visible when every optional enhancement fails", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Backend unavailable"));

    expect(dynamic).toBe("error");

    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Você no foco das buscas das melhores marcas.",
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(
      screen.getAllByRole("link", { name: "Sou Influenciador" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
  });
});
