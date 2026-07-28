import { z } from "zod";

export const catalogDetailQuerySchema = z.object({
  creatorId: z.uuid(),
  requestId: z.string().trim().min(8).max(128),
});

export type CatalogDetailQuery = z.infer<typeof catalogDetailQuerySchema>;
