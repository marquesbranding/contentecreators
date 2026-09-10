import type { MarketingRegistrationIntent } from "@/features/marketing/types/marketing.types";

const registrationIntentValues = ["influencer", "ugc", "company"] as const;
const registrationHrefByIntent = {
  COMPANY: "/sign-up?intent=company",
  INFLUENCER: "/sign-up?intent=influencer",
  UGC: "/sign-up?intent=ugc",
} as const satisfies Record<MarketingRegistrationIntent, string>;

export function buildRegistrationHref(
  intent: MarketingRegistrationIntent,
): `/sign-up?intent=${Lowercase<MarketingRegistrationIntent>}` {
  return registrationHrefByIntent[intent];
}

export function isMarketingRegistrationIntent(
  value: unknown,
): value is Lowercase<MarketingRegistrationIntent> {
  return registrationIntentValues.some((intent) => intent === value);
}
