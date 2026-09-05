import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { coverDisplayFrames } from "../domain/media-display-frames";
import { MediaCropFields } from "./media-crop-fields.client";

const crop = { horizontal: 50, vertical: 50, zoom: 1 };

describe("MediaCropFields", () => {
  it("shows the visible-area overlay and lets the viewer switch breakpoints", async () => {
    const user = userEvent.setup();
    render(
      <MediaCropFields
        aspectClassName="aspect-video"
        crop={crop}
        displayFrames={coverDisplayFrames}
        previewUrl="blob:preview"
        setCrop={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Área visível no seu perfil")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Computador" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Celular" }));

    expect(screen.getByRole("tab", { name: "Celular" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Computador" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders no overlay when no display frames are given", () => {
    render(
      <MediaCropFields
        aspectClassName="aspect-square"
        crop={crop}
        previewUrl="blob:preview"
        setCrop={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Área visível no seu perfil"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
