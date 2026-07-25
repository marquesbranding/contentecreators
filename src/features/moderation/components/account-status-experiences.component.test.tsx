import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { AnalysisPending } from "./analysis-pending";
import { SuspendedAccount } from "./suspended-account";

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe("account status experiences", () => {
  it("explains pending review and keeps protected listings unloaded", async () => {
    const { container } = render(<AnalysisPending signOutAction={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "Seu cadastro está sendo analisado",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nenhuma listagem do catálogo será carregada/iu),
    ).toBeInTheDocument();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("explains the temporary suspension without rendering catalog controls", async () => {
    const { container } = render(<SuspendedAccount signOutAction={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Seu acesso está suspenso" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/catálogo e os dados de outros participantes/iu),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /ver catálogo/iu }),
    ).not.toBeInTheDocument();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
