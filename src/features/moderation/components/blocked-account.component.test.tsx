import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { BlockedAccount } from "./blocked-account";

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe("blocked account status", () => {
  it("explains the terminal restriction without exposing decision details", async () => {
    const { container } = render(<BlockedAccount />);

    expect(
      screen.getByRole("heading", { name: "Esta conta está bloqueada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/não exibe detalhes da decisão/iu),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /criar conta/iu }),
    ).not.toBeInTheDocument();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
