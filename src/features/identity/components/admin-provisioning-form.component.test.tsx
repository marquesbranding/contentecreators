import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { AdminProvisioningForm } from "./admin-provisioning-form.client";

describe("admin provisioning form", () => {
  it("marks both fields as required before invoking the server action", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const { container } = render(<AdminProvisioningForm action={action} />);

    await user.click(
      screen.getByRole("button", { name: "Provisionar administrador" }),
    );

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("E-mail do administrador")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Motivo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getAllByText("Preencha este campo.")).toHaveLength(2);
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("submits normalized administrator intent and renders server success", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      message: "Convite enviado e acesso administrativo provisionado.",
      status: "success" as const,
    }));
    render(<AdminProvisioningForm action={action} />);

    await user.type(
      screen.getByLabelText("E-mail do administrador"),
      "admin.novo@example.com",
    );
    await user.type(
      screen.getByLabelText("Motivo"),
      "Aprovado para operar o backoffice",
    );
    await user.click(
      screen.getByRole("button", { name: "Provisionar administrador" }),
    );

    expect(
      await screen.findByText(
        "Convite enviado e acesso administrativo provisionado.",
      ),
    ).toBeInTheDocument();
    expect(action).toHaveBeenCalledOnce();
  });
});
