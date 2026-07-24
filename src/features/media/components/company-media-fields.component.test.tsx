import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyMediaFields } from "./company-media-fields.client";

describe("CompanyMediaFields", () => {
  it("integrates logo and cover with deferred onboarding identifiers", () => {
    const logoAssetId = "79000000-0000-4000-8000-000000000041";
    const coverAssetId = "79000000-0000-4000-8000-000000000042";
    const { container } = render(
      <CompanyMediaFields
        actions={{
          activate: vi.fn(),
          finalize: vi.fn(),
          prepare: vi.fn(),
        }}
        initialState={{
          coverAssetId,
          logoAssetId,
          profileExists: false,
        }}
      />,
    );

    expect(screen.getByLabelText("Logo da empresa (opcional)")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(
      screen.getByLabelText("Capa da empresa (opcional)"),
    ).toBeInTheDocument();
    expect(container.querySelector('input[name="logoAssetId"]')).toHaveValue(
      logoAssetId,
    );
    expect(container.querySelector('input[name="coverAssetId"]')).toHaveValue(
      coverAssetId,
    );
    expect(screen.getByText("Logo já enviado")).toBeInTheDocument();
    expect(screen.getByText("Capa já enviada")).toBeInTheDocument();
  });
});
