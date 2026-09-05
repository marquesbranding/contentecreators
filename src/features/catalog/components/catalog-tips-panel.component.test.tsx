import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogTipsPanel } from "./catalog-tips-panel";

describe("CatalogTipsPanel", () => {
  it("shows the three tip titles and the updated security copy", () => {
    render(<CatalogTipsPanel />);

    expect(screen.getByText("Atualize suas informações")).toBeInTheDocument();
    expect(screen.getByText("Aproveite as marcas")).toBeInTheDocument();
    expect(screen.getByText("Segurança sempre")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Todas as marcas por análise de perfil, mas nunca deixe de fazer contrato e formalizar suas parcerias! Nosso propósito é de conexão, o resto é com vocês!",
      ),
    ).toBeInTheDocument();
  });
});
