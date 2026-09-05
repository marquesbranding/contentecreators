import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DirectoryCompanyBrowserEntryDto } from "../api/catalog-directory.contract";
import { DirectoryResults } from "./directory-results";

function companyEntry(index: number): DirectoryCompanyBrowserEntryDto {
  return {
    city: "São Paulo",
    companyId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    displayName: `Empresa ${index}`,
    kind: "COMPANY",
    logo: null,
    segment: null,
    state: "SP",
    websiteUrl: null,
  };
}

describe("DirectoryResults", () => {
  it("renders every item in a single grid when there is no midlist slot", () => {
    const items = Array.from({ length: 5 }, (_, index) => companyEntry(index));

    render(<DirectoryResults items={items} status="success" />);

    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("repeats the midlist block every N items and cycles through the available slots", () => {
    const items = Array.from({ length: 20 }, (_, index) => companyEntry(index));
    const midlistSlots = [
      <p data-testid="midlist-slot" key="a">
        Slot A
      </p>,
      <p data-testid="midlist-slot" key="b">
        Slot B
      </p>,
    ];

    render(
      <DirectoryResults
        items={items}
        midlistSlots={midlistSlots}
        status="success"
      />,
    );

    // 20 items split into chunks of 8 -> 8, 8, 4: two internal boundaries,
    // so the block is inserted twice and cycles back to the first slot.
    const slots = screen.getAllByTestId("midlist-slot");
    expect(slots.map((slot) => slot.textContent)).toEqual(["Slot A", "Slot B"]);
    expect(screen.getAllByRole("article")).toHaveLength(20);
  });

  it("does not append a midlist block after the final chunk", () => {
    const items = Array.from({ length: 8 }, (_, index) => companyEntry(index));
    const midlistSlots = [<p data-testid="midlist-slot" key="a" />];

    render(
      <DirectoryResults
        items={items}
        midlistSlots={midlistSlots}
        status="success"
      />,
    );

    expect(screen.queryByTestId("midlist-slot")).not.toBeInTheDocument();
  });
});
