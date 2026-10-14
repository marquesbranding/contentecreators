import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";

import {
  formDefaults,
  type PlacementFormValues,
} from "../schemas/placement-form.schema";
import {
  PlacementCheckbox,
  PlacementContentToggle,
} from "./placement-visibility-toggle.client";

type FormCapture = (form: UseFormReturn<PlacementFormValues>) => void;

function Harness({
  capture,
  initial,
}: {
  capture: FormCapture;
  initial: Partial<PlacementFormValues>;
}) {
  const form = useForm<PlacementFormValues>({
    defaultValues: { ...formDefaults(), ...initial },
  });
  capture(form);

  return (
    <FormProvider {...form}>
      <label>
        Título
        <input {...form.register("title")} />
      </label>
      <label>
        Texto
        <textarea {...form.register("body")} />
      </label>
      <PlacementContentToggle
        contentName="title"
        label="Exibir título na arte"
        toggleName="showTitle"
      />
      <PlacementContentToggle
        contentName="body"
        label="Exibir texto na arte"
        toggleName="showBody"
      />
      <PlacementCheckbox
        label="Exibir empresa patrocinadora"
        name="showAdvertiserLabel"
      />
    </FormProvider>
  );
}

function renderHarness(initial: Partial<PlacementFormValues> = {}) {
  let captured: UseFormReturn<PlacementFormValues> | null = null;
  render(
    <Harness
      capture={(form) => {
        captured = form;
      }}
      initial={initial}
    />,
  );
  return {
    get values() {
      return captured?.getValues() as PlacementFormValues;
    },
  };
}

const titleToggle = () =>
  screen.getByRole("checkbox", { name: "Exibir título na arte" });
const bodyToggle = () =>
  screen.getByRole("checkbox", { name: "Exibir texto na arte" });

describe("sponsorship title and text visibility toggles", () => {
  it("starts disabled and unchecked when the title is empty", () => {
    renderHarness();

    expect(titleToggle()).toHaveAttribute("aria-disabled", "true");
    expect(titleToggle()).toHaveAttribute("aria-checked", "false");
  });

  it("enables once the title has text", async () => {
    renderHarness();

    await userEvent.type(screen.getByLabelText("Título"), "Black Friday");

    expect(titleToggle()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("stores the flag as true only when the admin checks it", async () => {
    const form = renderHarness({ title: "Campanha" });

    expect(form.values.showTitle).toBe(false);
    await userEvent.click(titleToggle());

    await waitFor(() => expect(form.values.showTitle).toBe(true));
  });

  it("unchecks and disables the title flag when the title is cleared", async () => {
    const form = renderHarness({ showTitle: true, title: "Campanha" });

    await userEvent.clear(screen.getByLabelText("Título"));

    await waitFor(() =>
      expect(titleToggle()).toHaveAttribute("aria-checked", "false"),
    );
    expect(titleToggle()).toHaveAttribute("aria-disabled", "true");
    expect(form.values.showTitle).toBe(false);
  });

  it("applies the same rule to the text field", async () => {
    const form = renderHarness({ body: "Texto de apoio", showBody: true });

    await userEvent.clear(screen.getByLabelText("Texto"));

    await waitFor(() => expect(form.values.showBody).toBe(false));
    expect(bodyToggle()).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps stored title and text while the flags stay off", () => {
    const form = renderHarness({
      body: "Texto interno",
      title: "Título interno",
    });

    expect(form.values).toMatchObject({
      body: "Texto interno",
      showBody: false,
      showTitle: false,
      title: "Título interno",
    });
  });

  it("does not couple the advertiser checkbox to the content rule", async () => {
    const form = renderHarness();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Exibir empresa patrocinadora" }),
    );

    await waitFor(() => expect(form.values.showAdvertiserLabel).toBe(true));
  });
});
