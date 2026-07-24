import { z } from "zod";

export const correctedProfileResubmissionCommandSchema = z.object({
  expectedAccountVersion: z.coerce.number().int().positive(),
  expectedProfileVersion: z.coerce.number().int().positive(),
  idempotencyKey: z.uuid(),
});

export type CorrectedProfileResubmissionCommand = z.infer<
  typeof correctedProfileResubmissionCommandSchema
>;
