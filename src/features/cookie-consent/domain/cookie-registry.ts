/**
 * Single source of truth for every cookie/technology the site can use. It feeds
 * the public cookie notice (`/cookies`) and versions the visitor's choice:
 * bump `COOKIE_REGISTRY_VERSION` whenever this list changes so the banner is
 * shown again (a unit test enforces it against a fingerprint).
 */
export const COOKIE_REGISTRY_VERSION = 1;

export type CookieCategory = "essential" | "advertising";

export type CookieTechnology = {
  category: CookieCategory;
  duration: string;
  name: string;
  provider: string;
  purpose: string;
};

export const cookieTechnologies: readonly CookieTechnology[] = [
  {
    category: "essential",
    duration: "Enquanto a sessão de login durar",
    name: "sb-*-auth-token",
    provider: "Contente Creators (Supabase Auth)",
    purpose:
      "Manter você conectado e proteger a sessão. Sem ele, o login deixa de funcionar.",
  },
  {
    category: "essential",
    duration: "30 minutos",
    name: "cc_signup_email",
    provider: "Contente Creators",
    purpose:
      "Lembrar o e-mail informado durante o cadastro para concluir a confirmação.",
  },
  {
    category: "essential",
    duration: "12 meses",
    name: "cc_cookie_consent",
    provider: "Contente Creators",
    purpose: "Guardar a sua escolha sobre cookies de publicidade e medição.",
  },
  {
    category: "advertising",
    duration: "90 dias",
    name: "_gcl_au, _gcl_aw",
    provider: "Google (Google Ads)",
    purpose:
      "Medir o resultado das campanhas da Contente e atribuir conversões, como a conclusão do cadastro.",
  },
  {
    category: "advertising",
    duration: "Até 13 meses",
    name: "IDE, test_cookie",
    provider: "Google (DoubleClick)",
    purpose:
      "Exibir anúncios da Contente em outros sites e medir a sua eficácia.",
  },
  {
    category: "advertising",
    duration: "90 dias",
    name: "_fbp, _fbc",
    provider: "Meta (Meta Pixel)",
    purpose:
      "Medir o resultado das campanhas da Contente e exibir anúncios em outros sites e redes sociais.",
  },
];

export const essentialCookieTechnologies = cookieTechnologies.filter(
  (technology) => technology.category === "essential",
);

export const advertisingCookieTechnologies = cookieTechnologies.filter(
  (technology) => technology.category === "advertising",
);

/** Cookie names (or prefixes) set by advertising/measurement technologies. */
export const advertisingCookieMatchers: readonly RegExp[] = [
  /^_gcl_/u,
  /^_ga/u,
  /^_gid$/u,
  /^IDE$/u,
  /^test_cookie$/u,
  /^_fbp$/u,
  /^_fbc$/u,
];
