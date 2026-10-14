import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryTestClient, QueryTestProvider } from "@/test/query-harness";

import { ProfileFormFields } from "../components/profile-form-fields.client";
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
      <button
        onClick={() => {
          if (formRef.current)
            void autosave.saveStep(formRef.current, "AUDIENCE");
        }}
      >
        Próxima etapa
      </button>
      <output>{autosave.status.message}</output>
      <span>{autosave.hasUnsavedChanges ? "pendente" : "sincronizado"}</span>
    </>
  );
}

function ProfileAutosaveHarness({ action }: { action: OnboardingDraftAction }) {
  const autosave = useOnboardingAutosave({
    action,
    initialDraft: null,
    role: "INFLUENCER",
  });

  return (
    <QueryTestProvider client={createQueryTestClient()}>
      <form onInput={autosave.onFormInput}>
        <ProfileFormFields role="INFLUENCER" />
      </form>
    </QueryTestProvider>
  );
}

describe("useOnboardingAutosave", () => {
  it("flushes edits made while a stage save is still in flight", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (
      value: Awaited<ReturnType<OnboardingDraftAction>>,
    ) => void;
    const action = vi
      .fn<OnboardingDraftAction>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        kind: "saved",
        draft: {
          role: "INFLUENCER",
          payload: { displayName: "Nome atualizado" },
          version: 2,
          updatedAt: "2026-09-15T12:00:00.000Z",
        },
      });
    render(<AutosaveHarness action={action} />);
    fireEvent.input(screen.getByLabelText("Nome de creator"), {
      target: { value: "Nome inicial" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Próxima etapa" }));
    fireEvent.input(screen.getByLabelText("Nome de creator"), {
      target: { value: "Nome atualizado" },
    });
    await act(() => vi.advanceTimersByTimeAsync(900));
    await act(async () =>
      resolveFirst({
        kind: "saved",
        draft: {
          role: "INFLUENCER",
          payload: { displayName: "Nome inicial" },
          version: 1,
          updatedAt: "2026-09-15T12:00:00.000Z",
        },
      }),
    );
    expect(action).toHaveBeenLastCalledWith({
      expectedVersion: 1,
      registrationStep: "AUDIENCE",
      role: "INFLUENCER",
      payload: { displayName: "Nome atualizado" },
    });
    expect(screen.getByText("sincronizado")).toBeInTheDocument();
  });
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
  it("autosaves the Instagram metrics typed in the real profile form", async () => {
    vi.useFakeTimers();
    const action = vi.fn<OnboardingDraftAction>().mockResolvedValue({
      draft: {
        payload: {},
        role: "INFLUENCER",
        updatedAt: "2026-07-24T14:00:00.000Z",
        version: 1,
      },
      kind: "saved",
    });
    render(<ProfileAutosaveHarness action={action} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Instagram" }));
    fireEvent.input(screen.getByLabelText("Link do perfil no Instagram"), {
      target: { value: "https://www.instagram.com/carla-em-cena" },
    });
    fireEvent.input(screen.getByLabelText("Visualizações"), {
      target: { value: "50000" },
    });
    fireEvent.input(screen.getByLabelText("Interações"), {
      target: { value: "3200" },
    });
    fireEvent.input(screen.getByLabelText("Novos seguidores"), {
      target: { value: "800" },
    });
    fireEvent.input(
      screen.getByLabelText("Conteúdo que você compartilhou", {
        selector: "input",
      }),
      { target: { value: "22" } },
    );

    await act(() => vi.advanceTimersByTimeAsync(900));

    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          socialChannels: [
            {
              followerCount: 0,
              interactions: 3200,
              isPrimary: true,
              newFollowers: 800,
              platform: "INSTAGRAM",
              sharedContent: 22,
              url: "https://www.instagram.com/carla-em-cena",
              views: 50000,
            },
          ],
        }),
      }),
    );
  });

  it("omits Instagram metrics left empty instead of saving them as zero", async () => {
    vi.useFakeTimers();
    const action = vi.fn<OnboardingDraftAction>().mockResolvedValue({
      draft: {
        payload: {},
        role: "INFLUENCER",
        updatedAt: "2026-07-24T14:00:00.000Z",
        version: 1,
      },
      kind: "saved",
    });
    render(<ProfileAutosaveHarness action={action} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Instagram" }));
    fireEvent.input(screen.getByLabelText("Link do perfil no Instagram"), {
      target: { value: "https://www.instagram.com/carla-em-cena" },
    });

    await act(() => vi.advanceTimersByTimeAsync(900));

    const input = action.mock.calls[0]?.[0] as {
      payload: {
        socialChannels?: {
          interactions?: number;
          newFollowers?: number;
          views?: number;
        }[];
      };
    };
    const instagram = input.payload.socialChannels?.[0];
    expect(instagram).toBeDefined();
    expect(instagram?.views).toBeUndefined();
    expect(instagram?.interactions).toBeUndefined();
    expect(instagram?.newFollowers).toBeUndefined();
  });
});
