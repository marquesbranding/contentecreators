import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DirectoryCompanyBrowserEntryDto } from "../api/catalog-directory.contract";
import { DirectoryResults } from "./directory-results";

function companyEntry(index: number): DirectoryCompanyBrowserEntryDto {
  return {
    city: "São Paulo",
    companyId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    cover: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    displayName: `Empresa ${index}`,
    isCdlMember: false,
    isOwnProfile: false,
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

  it("reserves bottom padding matching the stagger offset so the last row never overlaps a sibling", () => {
    const items = Array.from({ length: 5 }, (_, index) => companyEntry(index));

    render(<DirectoryResults items={items} status="success" />);

    expect(screen.getByRole("list")).toHaveClass(
      "sm:pb-8",
      "lg:pb-8",
      "xl:pb-16",
    );
  });

  it("repeats the midlist block every N items and cycles through the available slots", () => {
    const items = Array.from({ length: 20 }, (_, index) => companyEntry(index));
    const sponsoredCards = [
      { key: "a", node: <p data-testid="midlist-slot">Slot A</p> },
      { key: "b", node: <p data-testid="midlist-slot">Slot B</p> },
    ];

    render(
      <DirectoryResults
        items={items}
        sponsoredCards={sponsoredCards}
        status="success"
      />,
    );

    // 20 items split into chunks of 8 -> 8, 8, 4: two internal boundaries,
    // so the block is inserted twice and cycles back to the first slot.
    const slots = screen.getAllByTestId("midlist-slot");
    expect(slots.map((slot) => slot.textContent)).toEqual(["Slot A", "Slot B"]);
    expect(screen.getAllByRole("article")).toHaveLength(20);
    const list = screen.getByRole("list");
    expect(list.children[8]).toHaveTextContent("Slot A");
    expect(list.children[17]).toHaveTextContent("Slot B");
    expect(screen.getByText("20 perfis nesta página")).toBeVisible();
  });

  it("does not append a midlist block after the final chunk", () => {
    const items = Array.from({ length: 8 }, (_, index) => companyEntry(index));
    const sponsoredCards = [
      { key: "a", node: <p data-testid="midlist-slot" /> },
    ];

    render(
      <DirectoryResults
        items={items}
        sponsoredCards={sponsoredCards}
        status="success"
      />,
    );

    expect(screen.queryByTestId("midlist-slot")).not.toBeInTheDocument();
  });
});

it("keeps existing sponsored nodes stable when more profiles are appended and cycles A/B/A", () => {
  const items = Array.from({ length: 28 }, (_, index) => companyEntry(index));
  const sponsoredCards = [
    { key: "a", node: <span>Campanha A</span> },
    { key: "b", node: <span>Campanha B</span> },
  ];
  const { rerender } = render(
    <DirectoryResults
      items={items.slice(0, 10)}
      sponsoredCards={sponsoredCards}
      status="success"
    />,
  );
  const first = screen.getByRole("list").children[8];
  rerender(
    <DirectoryResults
      items={items}
      sponsoredCards={sponsoredCards}
      status="success"
    />,
  );
  const list = screen.getByRole("list");
  expect(list.children[8]).toBe(first);
  expect(list.children[8]).toHaveTextContent("Campanha A");
  expect(list.children[17]).toHaveTextContent("Campanha B");
  expect(list.children[26]).toHaveTextContent("Campanha A");
});
