import { z } from "zod";

export const LANDING_SHOWCASE_KINDS = ["CREATOR", "COMPANY"] as const;
export const landingShowcaseKindSchema = z.enum(LANDING_SHOWCASE_KINDS);
export type LandingShowcaseKind = z.infer<typeof landingShowcaseKindSchema>;

/**
 * An approved profile the backoffice may place on the public landing. Only
 * presentation fields travel here — never contact data — because this list is
 * what an admin scans to decide who represents the platform publicly.
 */
export const landingShowcaseCandidateSchema = z.object({
  city: z.string().nullable(),
  /** Set for creators only; companies carry `segment` instead. */
  creatorType: z.enum(["INFLUENCER", "UGC"]).nullable(),
  displayName: z.string().min(1),
  enabled: z.boolean(),
  kind: landingShowcaseKindSchema,
  /** Carousel order among enabled profiles of the same kind; null when hidden. */
  position: z.number().int().nonnegative().nullable(),
  profileId: z.uuid(),
  segment: z.string().nullable(),
  state: z.string().nullable(),
  version: z.number().int().positive(),
});
export type LandingShowcaseCandidateDto = z.infer<
  typeof landingShowcaseCandidateSchema
>;

export const landingShowcaseManagementResponseSchema = z.object({
  companies: z.array(landingShowcaseCandidateSchema),
  creators: z.array(landingShowcaseCandidateSchema),
});
export type LandingShowcaseManagementResponseDto = z.infer<
  typeof landingShowcaseManagementResponseSchema
>;

export const LANDING_SHOWCASE_ACTIONS = [
  "ENABLE",
  "DISABLE",
  "MOVE_UP",
  "MOVE_DOWN",
] as const;

export const landingShowcaseCommandSchema = z.strictObject({
  action: z.enum(LANDING_SHOWCASE_ACTIONS),
  /** Rejects a command built from a stale list instead of silently applying it. */
  expectedVersion: z.number().int().positive(),
  kind: landingShowcaseKindSchema,
  profileId: z.uuid("Identificador de perfil inválido."),
});
export type LandingShowcaseCommand = z.infer<
  typeof landingShowcaseCommandSchema
>;
