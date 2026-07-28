import { z } from "zod";

export const accountDetailQuerySchema = z.object({
  accountId: z.uuid(),
  requestId: z.string().trim().min(8).max(128),
});

export type AccountDetailQuery = z.infer<typeof accountDetailQuerySchema>;
