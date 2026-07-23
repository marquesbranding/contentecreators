import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { RoleSelectionForm } from "./role-selection-form.client";

describe("role selection form", () => {
  it("offers only influencer and company with permanent-choice copy", () => {
    render(<RoleSelectionForm action={vi.fn()} />);

    expect(
      screen.getByRole("radio", { name: "Sou creator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Represento uma empresa" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
    expect(
      screen.getByText(/não poderá ser alterada por você/iu),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar tipo de perfil" }),
    ).toBeDisabled();
  });

  it("preserves safe marketing intent and enables explicit confirmation", async () => {
    const user = userEvent.setup();

    render(<RoleSelectionForm action={vi.fn()} initialIntent="INFLUENCER" />);

    expect(screen.getByRole("radio", { name: "Sou creator" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Confirmar tipo de perfil" }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("radio", { name: "Represento uma empresa" }),
    );

    expect(
      screen.getByRole("radio", { name: "Represento uma empresa" }),
    ).toBeChecked();
  });

  it("keeps the Google first-access selection controlled from the modal opening", async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      render(<RoleSelectionForm action={vi.fn()} />);

      await user.click(
        screen.getByRole("radio", { name: "Represento uma empresa" }),
      );

      expect(
        screen.getByRole("radio", { name: "Represento uma empresa" }),
      ).toBeChecked();
      expect(
        [...errorSpy.mock.calls, ...warningSpy.mock.calls].some((call) =>
          call.some(
            (value) =>
              typeof value === "string" &&
              /uncontrolled|changing the default value state/iu.test(value),
          ),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
      warningSpy.mockRestore();
    }
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(
      <RoleSelectionForm action={vi.fn()} initialIntent="COMPANY" />,
    );

    await expect(
      getBlockingComponentAccessibilityViolations(container),
    ).resolves.toEqual([]);
  });
});
