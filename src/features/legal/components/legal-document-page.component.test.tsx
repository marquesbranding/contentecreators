import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";
import { privacyV1_0 } from "@/features/legal/content/privacy.v1_0";
import { termsV1_0 } from "@/features/legal/content/terms.v1_0";

describe("LegalDocumentPage", () => {
  it("renders the official Terms with version, anchored items and signature", () => {
    const { container } = render(<LegalDocumentPage document={termsV1_0} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Termos de Uso da Contente Creators",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Versão 1\.0/u)).toBeInTheDocument();
    expect(container.querySelector("#item-4-3")).toHaveTextContent(
      "só ficam visíveis para empresas aprovadas",
    );
    expect(
      screen.getByText("Elaboração jurídica: Candeia & Leorato Advogados"),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(
      /preliminar|lançamento bloqueado/iu,
    );
  });

  it("renders Privacy summary and semantic tables", () => {
    render(<LegalDocumentPage document={privacyV1_0} />);

    expect(
      screen.getByRole("heading", { name: "Em resumo" }),
    ).toBeInTheDocument();
    const retention = screen.getByRole("table", {
      name: "Prazos de guarda dos dados",
    });
    expect(
      within(retention)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Dados", "Prazo"]);
    expect(
      screen.getByRole("link", { name: /13\. Fale com a gente/u }),
    ).toHaveAttribute("href", "#cap-13");
  });
});
