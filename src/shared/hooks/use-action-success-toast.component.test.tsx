import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActionSuccessToast } from "./use-action-success-toast";

const successToast = vi.fn();

interface TestActionState {
  message?: string;
  status: string;
}

vi.mock("sonner", () => ({
  toast: {
    success: (...arguments_: unknown[]) => successToast(...arguments_),
  },
}));

describe("useActionSuccessToast", () => {
  beforeEach(() => {
    successToast.mockClear();
  });

  it("does not notify for the initial or error state", () => {
    const { rerender } = renderHook(
      ({ state }) =>
        useActionSuccessToast(state, {
          title: "Alterações salvas",
        }),
      {
        initialProps: {
          state: { status: "idle" } as TestActionState,
        },
      },
    );

    rerender({
      state: { message: "Não foi possível salvar.", status: "error" },
    });

    expect(successToast).not.toHaveBeenCalled();
  });

  it("notifies once for every new successful action state", () => {
    const firstSuccess = {
      message: "Seu perfil já está atualizado.",
      status: "success",
    };
    const { rerender } = renderHook(
      ({ state }) =>
        useActionSuccessToast(state, {
          title: "Alterações publicadas",
        }),
      {
        initialProps: {
          state: { status: "idle" } as TestActionState,
        },
      },
    );

    rerender({ state: firstSuccess });
    rerender({ state: firstSuccess });
    rerender({
      state: {
        message: "Uma nova alteração foi publicada.",
        status: "success",
      },
    });

    expect(successToast).toHaveBeenCalledTimes(2);
    expect(successToast).toHaveBeenNthCalledWith(1, "Alterações publicadas", {
      description: "Seu perfil já está atualizado.",
    });
  });

  it("supports confirmation states and a fallback description", () => {
    const { rerender } = renderHook(
      ({ state }) =>
        useActionSuccessToast(state, {
          description: "Confira sua caixa de entrada.",
          successStatuses: ["confirmation_required"],
          title: "Cadastro enviado",
        }),
      {
        initialProps: {
          state: { status: "idle" } as TestActionState,
        },
      },
    );

    rerender({ state: { status: "confirmation_required" } });

    expect(successToast).toHaveBeenCalledWith("Cadastro enviado", {
      description: "Confira sua caixa de entrada.",
    });
  });
});
