import { z } from "zod";

export const companyDetailQuerySchema = z.object({
  companyId: z.uuid(),
  requestId: z.string().trim().min(8).max(128),
});

export type CompanyDetailQuery = z.infer<typeof companyDetailQuerySchema>;
