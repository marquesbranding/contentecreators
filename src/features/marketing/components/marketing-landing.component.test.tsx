import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MarketingLanding } from "@/features/marketing";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void _priority;

    return (
      // The mock verifies the accessible contract without Next.js optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

describe("MarketingLanding", () => {
  it("renders the complete public journey in polished pt-BR", () => {
    render(<MarketingLanding />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Creators e marcas conectados no mesmo ritmo.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Você cria seu perfil e começa suas conexões – simples assim.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Você no foco das buscas das melhores marcas.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Para quem cria conteúdo e para quem procura resultados.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Descubra creators aprovados, filtre por região, segmento, perfil e métricas. Sua marca ganhando mais visibilidade com os influenciadores que tem a audiência certa para o seu negócio.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Da inscrição à conexão, sem complicação.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Perguntas frequentes",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("preserves separate influencer, UGC and company registration intents", () => {
    render(<MarketingLanding />);

    expect(
      screen.getAllByRole("link", { name: "Sou Influenciador" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
    expect(screen.getAllByRole("link", { name: "Sou UGC" })[0]).toHaveAttribute(
      "href",
      "/sign-up?intent=ugc",
    );
    expect(
      screen.getAllByRole("link", { name: "Sou Empresa" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=company");
    expect(screen.getAllByRole("link", { name: "Entrar" })[0]).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("offers both creator paths in the hero, the audience card and the final CTA", () => {
    render(<MarketingLanding />);

    /* Influencer and UGC are the same registration; the button only decides
       which account-type card opens pre-selected. */
    expect(
      screen.getAllByRole("link", { name: "Sou Influenciador" }),
    ).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "Sou UGC" })).toHaveLength(3);
  });

  it("leaves the final CTA free of decorative brand artwork", () => {
    render(<MarketingLanding />);

    const finalCta = screen.getByTestId("marketing-final-cta");

    expect(finalCta.querySelectorAll("img")).toHaveLength(0);
    expect(finalCta.querySelectorAll("svg")).toHaveLength(0);
  });

  it("links the configured support/privacy contact from the footer", () => {
    render(
      <MarketingLanding supportContactEmail="privacidade@contentecreators.test" />,
    );

    expect(
      screen.getByRole("link", { name: "Contato de suporte e privacidade" }),
    ).toHaveAttribute("href", "mailto:privacidade@contentecreators.test");
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Política de Privacidade" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getAllByRole("link", { name: "FAQ" })[0]).toHaveAttribute(
      "href",
      "#faq",
    );
  });

  it("opens the Vevox information dialog from the footer credit", async () => {
    const user = userEvent.setup();
    render(<MarketingLanding />);

    expect(
      screen.queryByRole("heading", { name: "Sobre a Vevox" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Conhecer a Vevox" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Abrir informações sobre a Vevox",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Sobre a Vevox" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Conhecer a Vevox" }),
    ).toHaveAttribute("href", "https://vevox.com.br/");
  });

  it("uses the supplied brand asset without participant listings", () => {
    render(<MarketingLanding />);

    const [header, footer] = screen.getAllByRole("img", {
      name: "Contente Creators",
    });

    expect(header).toHaveAttribute(
      "src",
      "/brand/official/contente-creators-blue.png",
    );
    expect(footer).toHaveAttribute(
      "src",
      "/brand/official/contente-creators-white.png",
    );
    expect(screen.queryByTestId("creator-listing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("company-listing")).not.toBeInTheDocument();
  });

  it("keeps public proof out of the static shell until data is available", () => {
    const { container } = render(<MarketingLanding />);

    expect(screen.queryByText("Creators e marcas em destaque")).toBeNull();
    expect(screen.queryByText("Comunidade com curadoria")).toBeNull();
    expect(screen.queryByText("Creators aprovados")).toBeNull();
    expect(screen.queryByText("Empresas aprovadas")).toBeNull();
    expect(
      container.querySelector('[data-testid="creator-listing"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="company-listing"]'),
    ).toBeNull();
  });

  it("credits Marques Branding beside the Vevox seal", async () => {
    const user = userEvent.setup();
    render(<MarketingLanding />);

    expect(screen.getByText("Powered by")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Abrir informações sobre a Marques Branding",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Sobre a Marques Branding" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Conhecer a Marques Branding" }),
    ).toHaveAttribute("href", "https://www.marquesbranding.com");
  });

  it("links the brand's own social accounts with their official marks", () => {
    render(<MarketingLanding />);

    const socialNav = screen.getByRole("navigation", { name: "Redes sociais" });

    expect(screen.getByRole("link", { name: "Threads" })).toHaveAttribute(
      "href",
      "https://www.threads.com/@contentecreators",
    );
    expect(screen.getByRole("link", { name: "YouTube" })).toHaveAttribute(
      "href",
      "https://youtube.com/@eusoucontente",
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
      "href",
      "https://x.com/eusoucontente",
    );
    /* Every href must be a bare profile address: copy/paste tracking
       parameters carry the sharer's session token. */
    for (const link of socialNav.querySelectorAll("a")) {
      expect(link.getAttribute("href")).not.toContain("?");
    }
  });

  it("uses the approved marketing color treatment without emoji symbols", () => {
    const { container } = render(<MarketingLanding />);

    expect(screen.getByTestId("marketing-hero")).toHaveClass(
      "marketing-hero-surface",
    );
    expect(screen.getByTestId("marketing-final-cta")).toHaveClass(
      "marketing-cta-surface",
    );
    expect(container.textContent).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    );
  });

  it("uses purposeful Magic UI motion while keeping the content accessible", () => {
    const { container } = render(<MarketingLanding />);

    expect(
      container.querySelectorAll('[data-slot="text-animate"]').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      container.querySelector('[data-slot="aurora-text"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId("marketing-motion-strip")).toHaveTextContent(
      /creators/iu,
    );
    expect(
      container.querySelector('[data-slot="scroll-velocity-container"]'),
    ).toBeInTheDocument();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(<MarketingLanding />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});
