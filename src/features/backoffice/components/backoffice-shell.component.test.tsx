import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { BackofficeShell } from "./backoffice-shell.client";

const usePathnameMock = vi.fn(() => "/backoffice");

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

function renderShell(pathname = "/backoffice") {
  const client = new QueryClient();
  const signOutAction = vi.fn(async () => undefined);

  usePathnameMock.mockReturnValue(pathname);

  const result = render(
    <QueryClientProvider client={client}>
      <BackofficeShell signOutAction={signOutAction}>
        <h1>Conteúdo protegido</h1>
      </BackofficeShell>
    </QueryClientProvider>,
  );

  return { ...result, client, signOutAction };
}

describe("BackofficeShell", () => {
  afterEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/backoffice");
  });

  it("renders the protected content, desktop navigation and current breadcrumb", async () => {
    const { container } = renderShell("/backoffice/moderation");

    expect(
      screen.getByRole("heading", { name: "Conteúdo protegido" }),
    ).toBeVisible();
    const navigation = screen.getByRole("navigation", {
      name: "Navegação do backoffice",
    });
    expect(navigation).toBeVisible();
    expect(
      within(navigation).getByRole("link", {
        name: "Moderação",
        current: "page",
      }),
    ).toHaveAttribute("href", "/backoffice/moderation");
    expect(
      screen.getByRole("navigation", { name: "Navegação estrutural" }),
    ).toHaveTextContent("Moderação");
    expect(screen.getByText("Contas").closest("a")).toBeNull();
    expect(
      screen.getByText("Contas").closest("[aria-disabled]"),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("identifies a profile review without exposing an account identifier", () => {
    renderShell("/backoffice/moderation/61d89515-0d70-4b03-a251-51bb21c279d0");

    const breadcrumb = screen.getByRole("navigation", {
      name: "Navegação estrutural",
    });

    expect(
      within(breadcrumb).getByRole("link", { name: "Moderação" }),
    ).toHaveAttribute("href", "/backoffice/moderation");
    expect(within(breadcrumb).getByText("Revisão do cadastro")).toBeVisible();
    expect(breadcrumb).not.toHaveTextContent(
      "61d89515-0d70-4b03-a251-51bb21c279d0",
    );
  });

  it("opens a focus-managed mobile navigation drawer and closes it after navigation", async () => {
    const user = userEvent.setup();
    renderShell("/backoffice");

    await user.click(
      screen.getByRole("button", { name: "Abrir menu do backoffice" }),
    );

    const drawer = screen.getByRole("dialog", {
      name: "Navegação do backoffice",
    });
    expect(drawer).toBeVisible();

    const moderationLink = screen
      .getAllByRole("link", { name: "Moderação" })
      .at(-1)!;
    moderationLink.addEventListener("click", (event) => {
      event.preventDefault();
    });
    await user.click(moderationLink);

    expect(
      screen.queryByRole("dialog", { name: "Navegação do backoffice" }),
    ).not.toBeInTheDocument();
  });

  it("clears protected query data before signing out", async () => {
    const user = userEvent.setup();
    const { client, signOutAction } = renderShell();

    client.setQueryData(["backoffice", "protected"], {
      total: 12,
    });

    await user.click(screen.getByRole("button", { name: "Sair" }));

    expect(client.getQueryData(["backoffice", "protected"])).toBeUndefined();
    expect(signOutAction).toHaveBeenCalledOnce();
  });
});
