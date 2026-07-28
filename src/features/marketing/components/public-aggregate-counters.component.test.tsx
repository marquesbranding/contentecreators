import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicAggregateCounters } from "./public-aggregate-counters";

describe("PublicAggregateCounters", () => {
  it("renders bounded aggregate proof without participant identity or links", () => {
    const { container } = render(
      <PublicAggregateCounters
        counters={{ approvedCompanies: 4, approvedCreators: 18 }}
      />,
    );

    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Creators aprovados")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Empresas aprovadas")).toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/perfil|ver catálogo/iu);
  });

  it("hides absent and non-meaningful values", () => {
    const { container } = render(
      <PublicAggregateCounters counters={{ approvedCreators: 8 }} />,
    );

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.queryByText("Empresas aprovadas")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  it("renders nothing without approved aggregate proof", () => {
    const { container } = render(<PublicAggregateCounters counters={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
