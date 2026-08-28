import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "./combobox";

const fruitItems = [
  { label: "Maçã", value: "APPLE" },
  { label: "Banana", value: "BANANA" },
  { label: "Cereja", value: "CHERRY" },
];

type FruitItem = (typeof fruitItems)[number];

function SingleSelectHarness() {
  const [value, setValue] = useState<FruitItem | null>(null);

  return (
    <div>
      <Combobox
        items={fruitItems}
        onValueChange={(next) => setValue(next)}
        value={value}
      >
        <ComboboxInputGroup>
          <ComboboxInput aria-label="Fruta" />
          <ComboboxIcon />
        </ComboboxInputGroup>
        <ComboboxContent>
          {(item: FruitItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxContent>
      </Combobox>
      <p data-testid="selected-value">{value?.value ?? "none"}</p>
    </div>
  );
}

function MultiSelectHarness() {
  const [values, setValues] = useState<FruitItem[]>([]);

  return (
    <div>
      <Combobox
        items={fruitItems}
        multiple
        onValueChange={(next) => setValues(next)}
        value={values}
      >
        <ComboboxInputGroup>
          <ComboboxChips>
            {values.map((item) => (
              <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
            ))}
          </ComboboxChips>
          <ComboboxInput aria-label="Frutas" />
        </ComboboxInputGroup>
        <ComboboxContent>
          {(item: FruitItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxContent>
      </Combobox>
      <p data-testid="selected-values">
        {values.map((item) => item.value).join(",") || "none"}
      </p>
    </div>
  );
}

describe("Combobox", () => {
  it("filters options by typing and selects one", async () => {
    const user = userEvent.setup();
    render(<SingleSelectHarness />);

    const input = screen.getByRole("combobox", { name: "Fruta" });
    await user.click(input);
    await user.type(input, "ban");

    expect(
      screen.queryByRole("option", { name: "Maçã" }),
    ).not.toBeInTheDocument();
    const bananaOption = await screen.findByRole("option", { name: "Banana" });
    await user.click(bananaOption);

    expect(screen.getByTestId("selected-value")).toHaveTextContent("BANANA");
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<SingleSelectHarness />);

    const input = screen.getByRole("combobox", { name: "Fruta" });
    await user.click(input);
    await user.type(input, "xyz-not-a-fruit");

    expect(
      await screen.findByText("Nenhum resultado encontrado."),
    ).toBeVisible();
  });

  it("supports selecting multiple options and removing one via its chip", async () => {
    const user = userEvent.setup();
    const { container } = render(<MultiSelectHarness />);

    const input = screen.getByRole("combobox", { name: "Frutas" });
    await user.click(input);
    await user.click(await screen.findByRole("option", { name: "Maçã" }));
    await user.click(await screen.findByRole("option", { name: "Cereja" }));

    expect(screen.getByTestId("selected-values")).toHaveTextContent(
      "APPLE,CHERRY",
    );
    const chips = container.querySelector<HTMLElement>(
      '[data-slot="combobox-chips"]',
    );
    if (!chips) {
      throw new Error("Expected chips container to be rendered.");
    }
    expect(within(chips).getByText("Maçã")).toBeVisible();
    expect(within(chips).getByText("Cereja")).toBeVisible();

    const [removeFirstChip] = screen.getAllByLabelText("Remover", {
      selector: "button",
    });
    if (!removeFirstChip) {
      throw new Error("Expected a chip remove button to be rendered.");
    }
    await user.click(removeFirstChip);

    expect(screen.getByTestId("selected-values")).toHaveTextContent("CHERRY");
  });

  it("supports keyboard-only selection", async () => {
    const user = userEvent.setup();
    render(<SingleSelectHarness />);

    await user.tab();
    expect(screen.getByRole("combobox", { name: "Fruta" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(screen.getByTestId("selected-value")).toHaveTextContent("BANANA");
  });
});

function PreselectedHarness({ initialValue }: { initialValue: string }) {
  const item = fruitItems.find((entry) => entry.value === initialValue) ?? null;
  return (
    <Combobox items={fruitItems} value={item}>
      <ComboboxInputGroup>
        <ComboboxInput aria-label="Fruta pré-selecionada" />
        <ComboboxIcon />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(entry: FruitItem) => (
          <ComboboxItem key={entry.value} value={entry}>
            {entry.label}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

describe("Combobox preselected value", () => {
  it("shows the selected item's label on initial render", () => {
    render(<PreselectedHarness initialValue="BANANA" />);

    expect(
      screen.getByRole("combobox", { name: "Fruta pré-selecionada" }),
    ).toHaveValue("Banana");
  });
});
