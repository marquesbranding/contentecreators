import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRequiredFieldValidation } from "./use-required-field-validation";

function TestForm({
  onRequestStep,
}: {
  onRequestStep?: (stepKey: string) => void;
}) {
  const { formRef, formValidationProps } = useRequiredFieldValidation({
    onRequestStep,
  });

  return (
    <form noValidate onSubmit={formValidationProps.onSubmit} ref={formRef}>
      <div data-step="2" hidden>
        <label htmlFor="hidden-field">Campo escondido</label>
        <input id="hidden-field" name="hiddenField" required type="text" />
      </div>
      <label htmlFor="visible-field">Campo visível</label>
      <input id="visible-field" name="visibleField" required type="text" />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("useRequiredFieldValidation", () => {
  it("focuses the first invalid field in document order", () => {
    render(<TestForm />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByLabelText("Campo escondido")).toHaveFocus();
  });

  it("requests the owning step before focusing a field hidden inside it", () => {
    const onRequestStep = vi.fn();
    render(<TestForm onRequestStep={onRequestStep} />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onRequestStep).toHaveBeenCalledWith("2");
  });
});
