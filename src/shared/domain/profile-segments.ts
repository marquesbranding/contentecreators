export const OTHER_NICHE_SLUG = "outros";
export const CUSTOM_NICHE_SLUG_PREFIX = "personalizado-";

export const creatorNicheOptions = [
  ["lifestyle-e-rotina", "Lifestyle e rotina"],
  ["moda-e-estilo", "Moda e estilo"],
  [
    "beleza-maquiagem-e-cuidados-pessoais",
    "Beleza, maquiagem e cuidados pessoais",
  ],
  ["saude-nutricao-e-bem-estar", "Saúde, nutrição e bem-estar"],
  [
    "fitness-esportes-e-atividade-fisica",
    "Fitness, esportes e atividade física",
  ],
  ["maternidade-paternidade-e-familia", "Maternidade, paternidade e família"],
  ["infantil-e-conteudo-para-criancas", "Infantil e conteúdo para crianças"],
  ["gastronomia-e-culinaria", "Gastronomia e culinária"],
  ["viagens-e-turismo", "Viagens e turismo"],
  ["casa-decoracao-e-organizacao", "Casa, decoração e organização"],
  [
    "financas-investimentos-e-empreendedorismo",
    "Finanças, investimentos e empreendedorismo",
  ],
  ["tecnologia-games-e-inovacao", "Tecnologia, games e inovação"],
  [
    "educacao-carreira-e-desenvolvimento-pessoal",
    "Educação, carreira e desenvolvimento pessoal",
  ],
  ["humor-e-entretenimento", "Humor e entretenimento"],
  ["musica-arte-e-cultura", "Música, arte e cultura"],
  ["pets-e-animais", "Pets e animais"],
  [
    "sustentabilidade-e-consumo-consciente",
    "Sustentabilidade e consumo consciente",
  ],
  ["relacionamentos-e-sexualidade", "Relacionamentos e sexualidade"],
  ["conteudo-adulto", "Conteúdo adulto"],
  ["comunidades-e-causas-sociais", "Comunidades e causas sociais"],
  [
    "marketing-publicidade-e-redes-sociais",
    "Marketing, publicidade e redes sociais",
  ],
  [OTHER_NICHE_SLUG, "Envie sua sugestão"],
] as const;

export const companySegmentOptions = [
  ["Alimentação", "Alimentação"],
  ["Beleza e cosméticos", "Beleza e cosméticos"],
  ["Educação", "Educação"],
  ["Entretenimento", "Entretenimento"],
  ["Esportes e fitness", "Esportes e fitness"],
  ["Moda", "Moda"],
  ["Saúde e bem-estar", "Saúde e bem-estar"],
  ["Tecnologia", "Tecnologia"],
  ["Varejo", "Varejo"],
  ["OTHER", "Outros"],
] as const;

export function isPredefinedCompanySegment(value: string) {
  return companySegmentOptions.some(
    ([optionValue]) => optionValue !== "OTHER" && optionValue === value,
  );
}

export function customNicheSlug(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 66)
    .replace(/-+$/gu, "");

  return `${CUSTOM_NICHE_SLUG_PREFIX}${normalized || "outro"}`;
}

export function isCustomNicheSlug(slug: string) {
  return slug.startsWith(CUSTOM_NICHE_SLUG_PREFIX);
}
