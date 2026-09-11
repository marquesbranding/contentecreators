import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BackofficeAccessLink } from "./backoffice-access-link.client";
import { BackofficeAccessProvider } from "./backoffice-access-context.client";

describe("BackofficeAccessLink", () => {
  it("lets an administrator reach the backoffice from onboarding", () => {
    render(
      <BackofficeAccessProvider hasBackofficeAccess>
        <BackofficeAccessLink />
      </BackofficeAccessProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Acessar backoffice" }),
    ).toHaveAttribute("href", "/backoffice");
  });

  it("renders nothing for a session without backoffice access", () => {
    const { container } = render(
      <BackofficeAccessProvider hasBackofficeAccess={false}>
        <BackofficeAccessLink />
      </BackofficeAccessProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any provider", () => {
    const { container } = render(<BackofficeAccessLink />);

    expect(container).toBeEmptyDOMElement();
  });
});
