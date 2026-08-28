import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { cropImageFile } from "../domain/crop-image";
import { MediaUploadField } from "./media-upload-field.client";

const uploadToSignedUrl = vi.fn();

vi.mock("@/shared/lib/supabase/browser-client", () => ({
  getBrowserSupabaseClient: () => ({
    storage: {
      from: () => ({
        uploadToSignedUrl,
      }),
    },
  }),
}));

vi.mock("../domain/crop-image", () => ({
  cropImageFile: vi.fn(),
}));

const mockedCropImageFile = vi.mocked(cropImageFile);
const pendingAssetId = "79000000-0000-4000-8000-000000000001";
const activeAssetId = "79000000-0000-4000-8000-000000000002";
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function actions() {
  return {
    activate: vi.fn().mockResolvedValue({
      asset: {
        id: activeAssetId,
        status: "ACTIVE",
      },
      kind: "activated",
      profileVersion: 4,
      replacedAssetId: null,
    }),
    finalize: vi.fn().mockResolvedValue({
      asset: {
        id: pendingAssetId,
        status: "PENDING",
      },
      kind: "finalized",
    }),
    prepare: vi.fn().mockResolvedValue({
      kind: "prepared",
      upload: {
        bucketName: "profile-media",
        objectPath:
          "b0000000-0000-4000-8000-000000000001/avatar/79000000-0000-4000-8000-000000000001.png",
        token: "signed-upload-token",
      },
    }),
    remove: vi.fn().mockResolvedValue({
      kind: "removed",
      profileVersion: 5,
    }),
  };
}

describe("MediaUploadField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:media-preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    uploadToSignedUrl.mockResolvedValue({
      data: { path: "private-path" },
      error: null,
    });
    mockedCropImageFile.mockImplementation(async (file) => file);
  });

  it("previews, crops and completes the full profile-media flow without Zustand", async () => {
    const user = userEvent.setup();
    const mediaActions = actions();
    const onComplete = vi.fn();
    const onProfileVersionChange = vi.fn();
    const { container } = render(
      <MediaUploadField
        actions={mediaActions}
        currentAssetId={null}
        label="Foto de perfil"
        onComplete={onComplete}
        onProfileVersionChange={onProfileVersionChange}
        purpose="AVATAR"
        required
      />,
    );
    const file = new File([pngBytes], "avatar.png", {
      type: "image/png",
    });

    await user.upload(screen.getByLabelText(/Foto de perfil/), file);

    expect(
      screen.getByRole("img", { name: "Prévia de avatar.png" }),
    ).toHaveAttribute("src", "blob:media-preview");
    expect(
      screen.getByRole("button", { name: "Ajustar recorte" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Enviar imagem" }));

    expect(
      await screen.findByText("Imagem atualizada com sucesso."),
    ).toBeVisible();
    expect(mediaActions.prepare).toHaveBeenCalledWith({
      declaredMimeType: "image/png",
      fileName: "avatar.png",
      purpose: "AVATAR",
      sizeBytes: pngBytes.length,
    });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      expect.stringContaining("/avatar/"),
      "signed-upload-token",
      file,
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    );
    expect(mediaActions.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketName: "profile-media",
        purpose: "AVATAR",
      }),
    );
    expect(mediaActions.activate).toHaveBeenCalledWith({
      assetId: pendingAssetId,
      expectedCurrentAssetId: null,
      purpose: "AVATAR",
    });
    expect(onComplete).toHaveBeenCalledWith(activeAssetId);
    expect(onProfileVersionChange).toHaveBeenCalledWith(4);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("announces a recoverable error and retries the same selected file", async () => {
    const user = userEvent.setup();
    const mediaActions = actions();
    mediaActions.prepare
      .mockResolvedValueOnce({
        code: "STORAGE_UNAVAILABLE",
        kind: "error",
      })
      .mockResolvedValueOnce({
        kind: "prepared",
        upload: {
          bucketName: "profile-media",
          objectPath:
            "b0000000-0000-4000-8000-000000000001/avatar/79000000-0000-4000-8000-000000000001.png",
          token: "retry-token",
        },
      });
    render(
      <MediaUploadField
        actions={mediaActions}
        currentAssetId={null}
        label="Foto de perfil"
        purpose="AVATAR"
      />,
    );
    const file = new File([pngBytes], "avatar.png", {
      type: "image/png",
    });

    await user.upload(screen.getByLabelText("Foto de perfil"), file);
    await user.click(screen.getByRole("button", { name: "Enviar imagem" }));

    expect(
      await screen.findByText(
        "Não foi possível acessar o armazenamento agora.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByText("Imagem atualizada com sucesso."),
    ).toBeVisible();
    expect(mediaActions.prepare).toHaveBeenCalledTimes(2);
  });

  it("keeps initial onboarding media pending until the profile transaction activates it", async () => {
    const user = userEvent.setup();
    const mediaActions = actions();
    const onComplete = vi.fn();
    render(
      <MediaUploadField
        actions={mediaActions}
        activateOnUpload={false}
        currentAssetId={null}
        label="Foto de perfil"
        onComplete={onComplete}
        purpose="AVATAR"
      />,
    );
    const file = new File([pngBytes], "avatar.png", {
      type: "image/png",
    });

    await user.upload(screen.getByLabelText("Foto de perfil"), file);
    await user.click(screen.getByRole("button", { name: "Enviar imagem" }));

    expect(
      await screen.findByText("Imagem pronta para o envio do perfil."),
    ).toBeVisible();
    expect(mediaActions.activate).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(pendingAssetId);
  });

  it("exposes crop controls with accessible names and live preview", async () => {
    const user = userEvent.setup();
    render(
      <MediaUploadField
        actions={actions()}
        currentAssetId={null}
        label="Capa"
        purpose="COVER"
      />,
    );
    const file = new File([pngBytes], "capa.png", {
      type: "image/png",
    });

    await user.upload(screen.getByLabelText("Capa"), file);
    await user.click(screen.getByRole("button", { name: "Ajustar recorte" }));

    const zoom = await screen.findByRole("slider", {
      name: "Ampliação",
    });
    const horizontal = screen.getByRole("slider", {
      name: "Posição horizontal",
    });
    const vertical = screen.getByRole("slider", {
      name: "Posição vertical",
    });

    fireEvent.change(zoom, { target: { value: "1.5" } });
    fireEvent.change(horizontal, { target: { value: "25" } });
    fireEvent.change(vertical, { target: { value: "75" } });

    await waitFor(() => {
      expect(zoom).toHaveValue("1.5");
      expect(horizontal).toHaveValue("25");
      expect(vertical).toHaveValue("75");
    });
  });

  it("opens a single 'Mudar foto' menu offering Carregar foto, Remover foto atual and Cancelar", async () => {
    const user = userEvent.setup();
    const mediaActions = actions();
    const onRemove = vi.fn();
    const onProfileVersionChange = vi.fn();
    render(
      <MediaUploadField
        actions={mediaActions}
        currentAssetId={activeAssetId}
        label="Foto de perfil"
        onProfileVersionChange={onProfileVersionChange}
        onRemove={onRemove}
        purpose="AVATAR"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Enviar imagem" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mudar foto" }));

    expect(
      screen.getByRole("button", { name: "Carregar foto" }),
    ).toBeVisible();
    const removeButton = screen.getByRole("button", {
      name: "Remover foto atual",
    });
    expect(removeButton).toBeVisible();

    await user.click(removeButton);

    expect(mediaActions.remove).toHaveBeenCalledWith({ purpose: "AVATAR" });
    await waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
    expect(onProfileVersionChange).toHaveBeenCalledWith(5);
  });

  it("cancels the menu without changing the current image", async () => {
    const user = userEvent.setup();
    render(
      <MediaUploadField
        actions={actions()}
        currentAssetId={activeAssetId}
        label="Foto de perfil"
        purpose="AVATAR"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mudar foto" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("button", { name: "Carregar foto" }),
    ).not.toBeInTheDocument();
  });

  it("omits 'Remover foto atual' when there is no current image", async () => {
    const user = userEvent.setup();
    render(
      <MediaUploadField
        actions={actions()}
        currentAssetId={null}
        label="Foto de perfil"
        purpose="AVATAR"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Mudar foto" }));

    expect(
      screen.queryByRole("button", { name: "Remover foto atual" }),
    ).not.toBeInTheDocument();
  });
});
