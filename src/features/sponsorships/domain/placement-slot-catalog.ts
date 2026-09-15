import type {
  PlacementType,
  PlacementRoute,
} from "../types/sponsorship-placement.types";

export interface PlacementSlotMetadata {
  slotKey: string;
  placementType: PlacementType;
  name: string;
  description: string;
  bestFor: string;
  route: PlacementRoute;
  path: string;
  audience: string;
  limit: number;
  usesImage: boolean;
  usesLink: boolean;
  bodyRequired: boolean;
  supportsVariants: boolean;
  image: { width: number; height: number; aspectClassName: string };
  tabletImage: { width: number; height: number; aspectClassName: string };
  mobileImage: { width: number; height: number; aspectClassName: string };
}
const wide = { width: 1600, height: 800, aspectClassName: "aspect-[2/1]" };
const mobile = { width: 640, height: 360, aspectClassName: "aspect-video" };
const base = {
  route: "CATALOG" as const,
  path: "/app/catalog",
  audience: "Só logados",
  limit: 1,
  usesImage: true,
  usesLink: true,
  bodyRequired: false,
  supportsVariants: true,
  image: wide,
  tabletImage: wide,
  mobileImage: wide,
};
export const placementSlotCatalog = [
  {
    ...base,
    slotKey: "catalog-top",
    placementType: "TOP_BANNER",
    name: "Banner no topo do catálogo",
    description: "Acima de todos os criadores, com imagem e texto sobreposto.",
    bestFor: "Campanha principal · maior destaque",
    image: { width: 1600, height: 500, aspectClassName: "aspect-[16/5]" },
    tabletImage: { width: 1024, height: 384, aspectClassName: "aspect-[8/3]" },
    mobileImage: mobile,
  },
  {
    ...base,
    slotKey: "landing-top",
    placementType: "TOP_BANNER",
    name: "Banner na página inicial pública",
    description: "Texto e imagem na página inicial, antes do login.",
    bestFor: "Alcançar visitantes sem login",
    route: "PUBLIC_LANDING",
    path: "/",
    audience: "Público",
  },
  {
    ...base,
    slotKey: "catalog-carousel",
    placementType: "CAROUSEL",
    name: "Carrossel do catálogo",
    description: "Cards com rolagem horizontal abaixo do banner principal.",
    bestFor: "Várias marcas ao mesmo tempo",
    limit: 10,
  },
  {
    ...base,
    slotKey: "catalog-midlist",
    placementType: "CAROUSEL",
    name: "Anúncios no meio da listagem",
    description:
      "Cards intercalados entre os criadores. O card inteiro é clicável.",
    bestFor: "Anúncio nativo entre criadores",
    limit: 3,
    supportsVariants: false,
    image: { width: 1000, height: 800, aspectClassName: "aspect-[5/4]" },
  },
  {
    ...base,
    slotKey: "catalog-inline",
    placementType: "INLINE_BANNER",
    name: "Barra lateral do catálogo",
    description: "Fixa na lateral no desktop; acima da listagem no celular.",
    bestFor: "Presença contínua durante a rolagem",
    bodyRequired: true,
    image: { width: 1200, height: 900, aspectClassName: "aspect-[4/3]" },
  },
  {
    ...base,
    slotKey: "catalog-featured",
    placementType: "FEATURED_CREATOR",
    name: "Criador em destaque",
    description: "Foto e nome do criador com acesso direto ao perfil.",
    bestFor: "Promover um criador aprovado",
    usesImage: false,
    usesLink: false,
    supportsVariants: false,
  },
] as const satisfies readonly PlacementSlotMetadata[];
export type PlacementSlotKey = (typeof placementSlotCatalog)[number]["slotKey"];
export function getPlacementSlot(
  slotKey: string,
): PlacementSlotMetadata | undefined {
  return placementSlotCatalog.find((slot) => slot.slotKey === slotKey);
}
export const placementTypeLabels: Record<PlacementType, string> = {
  TOP_BANNER: "Banner de topo",
  INLINE_BANNER: "Banner lateral / inline",
  CAROUSEL: "Carrossel",
  FEATURED_CREATOR: "Criador em destaque",
};

export function placementImageRatio(image: PlacementSlotMetadata["image"]) {
  let divisor = image.width;
  let remainder = image.height;
  while (remainder) [divisor, remainder] = [remainder, divisor % remainder];
  return `${image.width / divisor}:${image.height / divisor}`;
}
