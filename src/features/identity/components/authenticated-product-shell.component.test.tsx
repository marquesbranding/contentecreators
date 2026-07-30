import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getBrowserQueryClient } from "@/shared/query/browser-query-client";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { AuthenticatedProductShell } from "./authenticated-product-shell.client";

const usePathnameMock = vi.fn(() => "/app/catalog");

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { preload?: boolean }) => {
    const { preload, ...imageProps } = props;
    void preload;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...imageProps} />
    );
  },
}));

function renderShell(pathname = "/app/catalog") {
  const signOutAction = vi.fn(async () => undefined);

  usePathnameMock.mockReturnValue(pathname);

  const result = render(
    <AuthenticatedProductShell signOutAction={signOutAction}>
      <main id="main-content">
        <h1>Conteúdo do catálogo</h1>
      </main>
    </AuthenticatedProductShell>,
  );

  return { ...result, signOutAction };
}

describe("AuthenticatedProductShell", () => {
  afterEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/app/catalog");
  });

  it("renders a persistent product navigation and marks creator discovery active", async () => {
    const { container } = renderShell("/app/creators/creator-id");

    expect(
      screen.getByRole("heading", { name: "Conteúdo do catálogo" }),
    ).toBeVisible();

    const navigation = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(
      within(navigation).getByRole("link", {
        name: "Encontrar creators",
        current: "page",
      }),
    ).toHaveAttribute("href", "/app/catalog");
    expect(
      within(navigation).getByRole("link", { name: "Meu perfil" }),
    ).toHaveAttribute("href", "/app/profile");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("marks the profile destination active", () => {
    renderShell("/app/profile");

    expect(
      within(
        screen.getByRole("navigation", { name: "Navegação principal" }),
      ).getByRole("link", {
        name: "Meu perfil",
        current: "page",
      }),
    ).toHaveAttribute("href", "/app/profile");
  });

  it("opens and closes the mobile navigation sheet", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(
      screen.getByRole("button", { name: "Abrir menu principal" }),
    );

    const drawer = screen.getByRole("dialog", {
      name: "Navegação principal",
    });
    expect(drawer).toBeVisible();

    const profileLink = within(drawer).getByRole("link", {
      name: "Meu perfil",
    });
    profileLink.addEventListener("click", (event) => {
      event.preventDefault();
    });
    await user.click(profileLink);

    expect(
      screen.queryByRole("dialog", { name: "Navegação principal" }),
    ).not.toBeInTheDocument();
  });

  it("clears protected query data before signing out", async () => {
    const user = userEvent.setup();
    const client = getBrowserQueryClient();
    const { signOutAction } = renderShell();

    client.clear();
    client.setQueryData(["catalog", "protected"], { total: 12 });
    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    expect(client.getQueryData(["catalog", "protected"])).toBeUndefined();
    expect(signOutAction).toHaveBeenCalledOnce();
  });
});
