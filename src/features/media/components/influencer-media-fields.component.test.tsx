import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InfluencerMediaFields } from "./influencer-media-fields.client";

describe("InfluencerMediaFields", () => {
  it("integrates avatar and cover with pending asset identifiers in the profile form", () => {
    const avatarAssetId = "79000000-0000-4000-8000-000000000021";
    const coverAssetId = "79000000-0000-4000-8000-000000000022";
    const { container } = render(
      <InfluencerMediaFields
        actions={{
          activate: vi.fn(),
          finalize: vi.fn(),
          prepare: vi.fn(),
        }}
        initialState={{
          avatarAssetId,
          coverAssetId,
          profileExists: false,
        }}
      />,
    );

    expect(screen.getByLabelText("Perfil")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByLabelText("Capa")).toBeInTheDocument();
    expect(container.querySelector('input[name="avatarAssetId"]')).toHaveValue(
      avatarAssetId,
    );
    expect(container.querySelector('input[name="coverAssetId"]')).toHaveValue(
      coverAssetId,
    );
    expect(screen.getByText("Foto de perfil já enviada")).toBeInTheDocument();
    expect(screen.getByText("Capa já enviada")).toBeInTheDocument();
  });
});
