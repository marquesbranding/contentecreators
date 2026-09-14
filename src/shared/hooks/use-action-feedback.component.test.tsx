import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { emitActionFeedback, useActionFeedback } from "./use-action-feedback";

const successToast = vi.fn();
const errorToast = vi.fn();

interface TestActionState {
  message?: string;
  retryable?: boolean;
  status: string;
  title?: string;
}

vi.mock("sonner", () => ({
  toast: {
    error: (...arguments_: unknown[]) => errorToast(...arguments_),
    success: (...arguments_: unknown[]) => successToast(...arguments_),
  },
}));

describe("useActionFeedback", () => {
  beforeEach(() => {
    successToast.mockClear();
    errorToast.mockClear();
  });

  it("toasts success states", () => {
    const { rerender } = renderHook(
      ({ state }: { state: TestActionState }) =>
        useActionFeedback(state, { title: "Alterações publicadas" }),
      { initialProps: { state: { status: "idle" } as TestActionState } },
    );

    rerender({ state: { message: "Perfil salvo.", status: "success" } });

    expect(successToast).toHaveBeenCalledWith("Alterações publicadas", {
      description: "Perfil salvo.",
    });
    expect(errorToast).not.toHaveBeenCalled();
  });

  it("toasts error states with the state's own title and a long duration", () => {
    const { rerender } = renderHook(
      ({ state }: { state: TestActionState }) =>
        useActionFeedback(state, { title: "Alterações publicadas" }),
      { initialProps: { state: { status: "idle" } as TestActionState } },
    );

    rerender({
      state: {
        message: "O CNPJ já está cadastrado.",
        status: "error",
        title: "Não foi possível salvar sua empresa",
      },
    });

    expect(errorToast).toHaveBeenCalledWith("Não foi possível salvar sua empresa", {
      action: undefined,
      description: "O CNPJ já está cadastrado.",
      duration: 8_000,
    });
  });

  it("offers a retry action only when the error is retryable", () => {
    const onRetry = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: TestActionState }) =>
        useActionFeedback(state, { onRetry, title: "Alterações publicadas" }),
      { initialProps: { state: { status: "idle" } as TestActionState } },
    );

    rerender({
      state: { message: "Tente de novo.", retryable: true, status: "error" },
    });

    const [, options] = errorToast.mock.calls.at(-1) as [
      string,
      { action?: { label: string; onClick: () => void } },
    ];
    expect(options.action?.label).toBe("Tentar de novo");

    options.action?.onClick();
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("scrolls and focuses the error alert ref on a new error state", () => {
    const { rerender, result } = renderHook(
      ({ state }: { state: TestActionState }) =>
        useActionFeedback(state, { title: "Alterações publicadas" }),
      { initialProps: { state: { status: "idle" } as TestActionState } },
    );

    const node = document.createElement("div");
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    node.scrollIntoView = scrollIntoView;
    node.focus = focus;
    result.current.errorAlertRef.current = node;

    rerender({ state: { message: "Falhou.", status: "error" } });

    expect(scrollIntoView).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it("never toasts twice for the same state object, even across a remount", () => {
    const state: TestActionState = { message: "Salvo.", status: "success" };

    emitActionFeedback(state, { title: "Alterações publicadas" });
    emitActionFeedback(state, { title: "Alterações publicadas" });

    expect(successToast).toHaveBeenCalledTimes(1);
  });
});
