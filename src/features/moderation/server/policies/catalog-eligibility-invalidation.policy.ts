import "server-only";

type RevalidatePath = (
  path: string,
  type?: "layout" | "page",
) => undefined | void;

export function invalidateCatalogEligibilityPaths(
  revalidatePath: RevalidatePath,
) {
  revalidatePath("/app/catalog");
  revalidatePath("/app/creators/[creatorId]", "page");
}
