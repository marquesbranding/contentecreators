import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OnboardingDraftAction } from "../types/onboarding-draft.types";
import { useOnboardingAutosave } from "./use-onboarding-autosave";

function AutosaveHarness({ action }: { action: OnboardingDraftAction }) {
  const formRef = useRef<HTMLFormElement>(null);
  const autosave = useOnboardingAutosave({
    action,
    initialDraft: null,
    role: "INFLUENCER",
  });

  return (
    <>
      <form onInput={autosave.onFormInput} ref={formRef}>
        <input aria-label="Nome de creator" name="displayName" />
        <input defaultValue="NaoPersistir123" name="password" />
        <input defaultChecked name="termsAccepted" type="checkbox" />
      </form>
      <output>{autosave.status.message}</output>
      <span>{autosave.hasUnsavedChanges ? "pendente" : "sincronizado"}</span>
    </>
  );
}

describe("useOnboardingAutosave", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces safe profile fields and never sends credentials or consent flags", async () => {
    vi.useFakeTimers();
    const action = vi.fn<OnboardingDraftAction>().mockResolvedValue({
      draft: {
        payload: { displayName: "Joana Creator" },
        role: "INFLUENCER",
        updatedAt: "2026-07-24T14:00:00.000Z",
        version: 1,
      },
      kind: "saved",
    });
    render(<AutosaveHarness action={action} />);

    expect(screen.getByText("Rascunho ainda não salvo")).toBeInTheDocument();
    expect(screen.getByText("sincronizado")).toBeInTheDocument();

    fireEvent.input(screen.getByLabelText("Nome de creator"), {
      target: { value: "Joana Creator" },
    });

    expect(screen.getByText("Alterações pendentes")).toBeInTheDocument();
    expect(screen.getByText("pendente")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledWith({
      expectedVersion: 0,
      payload: { displayName: "Joana Creator" },
      role: "INFLUENCER",
    });
    expect(screen.getByText("Rascunho salvo")).toBeInTheDocument();
    expect(screen.getByText("sincronizado")).toBeInTheDocument();
  });

  it("keeps unsaved protection active when another tab wins the version", async () => {
    vi.useFakeTimers();
    const action = vi.fn<OnboardingDraftAction>().mockResolvedValue({
      currentVersion: 3,
      kind: "conflict",
      message:
        "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.",
    });
    render(<AutosaveHarness action={action} />);

    fireEvent.input(screen.getByLabelText("Nome de creator"), {
      target: { value: "Versão local" },
    });
    await act(() => vi.advanceTimersByTimeAsync(900));

    expect(screen.getByText("Atualizado em outra aba")).toBeInTheDocument();
    expect(screen.getByText("pendente")).toBeInTheDocument();
  });
});
