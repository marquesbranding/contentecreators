import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
    isInfluencerJourneyParticipant: false,
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

describe("DirectoryResults sponsored rotation", () => {
  function sponsoredCardsOf(names: string[]) {
    return names.map((name) => ({
      key: `key-${name}`,
      node: <span>{`Campanha ${name}`}</span>,
    }));
  }

  function sponsorNames() {
    return screen
      .queryAllByRole("listitem", { name: "Patrocínio" })
      .map((item) => item.textContent?.replace("Campanha ", "") ?? "");
  }

  it("repeats the single card in every sponsored slot", () => {
    const items = Array.from({ length: 33 }, (_, index) => companyEntry(index));

    render(
      <DirectoryResults
        items={items}
        sponsoredCards={sponsoredCardsOf(["A"])}
        status="success"
      />,
    );

    expect(sponsorNames()).toEqual(["A", "A", "A", "A"]);
  });

  it("cycles three cards as A, B, C, A, B across five sponsored slots", () => {
    const items = Array.from({ length: 48 }, (_, index) => companyEntry(index));

    render(
      <DirectoryResults
        items={items}
        sponsoredCards={sponsoredCardsOf(["A", "B", "C"])}
        status="success"
      />,
    );

    expect(sponsorNames()).toEqual(["A", "B", "C", "A", "B"]);
  });

  it("shows all eight cards once before repeating and never places a card next to itself", () => {
    const items = Array.from({ length: 73 }, (_, index) => companyEntry(index));
    const names = ["A", "B", "C", "D", "E", "F", "G", "H"];

    render(
      <DirectoryResults
        items={items}
        sponsoredCards={sponsoredCardsOf(names)}
        status="success"
      />,
    );

    const sequence = sponsorNames();
    expect(sequence).toEqual([...names, "A"]);
    sequence.forEach((name, index) => {
      if (index > 0) {
        expect(name).not.toBe(sequence[index - 1]);
      }
    });
  });

  it("keeps the rotation going across 'Carregar mais' using the accumulated items", async () => {
    const user = userEvent.setup();
    const allItems = Array.from({ length: 64 }, (_, index) =>
      companyEntry(index),
    );

    function Harness() {
      const [count, setCount] = useState(16);

      return (
        <DirectoryResults
          hasNextPage={count < allItems.length}
          items={allItems.slice(0, count)}
          onLoadMore={() =>
            setCount((current) => Math.min(allItems.length, current + 16))
          }
          sponsoredCards={sponsoredCardsOf(["A", "B", "C"])}
          status="success"
        />
      );
    }

    render(<Harness />);

    expect(sponsorNames()).toEqual(["A"]);

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(sponsorNames()).toEqual(["A", "B", "C"]);

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(sponsorNames()).toEqual(["A", "B", "C", "A", "B"]);

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(sponsorNames()).toEqual(["A", "B", "C", "A", "B", "C", "A"]);
    expect(screen.getAllByRole("article")).toHaveLength(64);
  });
});
