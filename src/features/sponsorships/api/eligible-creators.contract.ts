import { z } from "zod";
export const eligibleCreatorsQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  selectedId: z.uuid().optional(),
});
export const eligibleCreatorsResponseSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            displayName: z.string(),
            location: z.string().nullable(),
            avatarUrl: z.url().nullable(),
          })
          .strict(),
      )
      .max(21),
  })
  .strict();
export type EligibleCreator = z.infer<
  typeof eligibleCreatorsResponseSchema
>["items"][number];
