import { readAdTagConfigFromEnv } from "./ad-tags";
import { getConsentSnapshot } from "./consent-store";

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

function adsAccepted() {
  const consent = getConsentSnapshot();

  return consent.status === "decided" && consent.ads;
}

/** Page views never carry account, name, e-mail or profile data. */
export function sendPageView(pathname: string) {
  if (!adsAccepted()) {
    return;
  }

  const { googleAdsId } = readAdTagConfigFromEnv();

  window.gtag?.("event", "page_view", {
    page_path: pathname,
    send_to: googleAdsId,
  });
  window.fbq?.("track", "PageView");
}

/** Fired once when a registration is submitted; carries no personal data. */
export function trackRegistrationCompleted() {
  if (!adsAccepted()) {
    return;
  }

  const { googleAdsConversionLabel, googleAdsId } = readAdTagConfigFromEnv();

  if (googleAdsId && googleAdsConversionLabel) {
    window.gtag?.("event", "conversion", {
      send_to: `${googleAdsId}/${googleAdsConversionLabel}`,
    });
  }
  window.fbq?.("track", "CompleteRegistration");
}
