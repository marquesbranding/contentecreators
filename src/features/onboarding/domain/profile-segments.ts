export const OTHER_NICHE_SLUG = "outros";
export const CUSTOM_NICHE_SLUG_PREFIX = "personalizado-";

export const creatorNicheOptions = [
  ["beleza", "Beleza"],
  ["gastronomia", "Gastronomia"],
  ["moda", "Moda"],
  ["tecnologia", "Tecnologia"],
  ["viagem", "Viagem"],
  [OTHER_NICHE_SLUG, "Outros"],
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
