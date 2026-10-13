export type AdTagConfig = {
  googleAdsConversionLabel?: string;
  googleAdsId?: string;
  metaPixelId?: string;
};

const GOOGLE_ADS_ID_PATTERN = /^AW-\d{6,}$/u;
const META_PIXEL_ID_PATTERN = /^\d{8,20}$/u;

/** Accepts only well-formed IDs so a bad env value never reaches a script URL. */
export function normalizeAdTagConfig(raw: AdTagConfig): AdTagConfig {
  const googleAdsId = raw.googleAdsId?.trim();
  const metaPixelId = raw.metaPixelId?.trim();
  const label = raw.googleAdsConversionLabel?.trim();

  return {
    googleAdsConversionLabel:
      label && /^[\w-]{4,64}$/u.test(label) ? label : undefined,
    googleAdsId:
      googleAdsId && GOOGLE_ADS_ID_PATTERN.test(googleAdsId)
        ? googleAdsId
        : undefined,
    metaPixelId:
      metaPixelId && META_PIXEL_ID_PATTERN.test(metaPixelId)
        ? metaPixelId
        : undefined,
  };
}

export function readAdTagConfigFromEnv(): AdTagConfig {
  return normalizeAdTagConfig({
    googleAdsConversionLabel:
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
    googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  });
}
