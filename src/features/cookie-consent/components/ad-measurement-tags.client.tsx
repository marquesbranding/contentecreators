"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

import { readAdTagConfigFromEnv } from "../domain/ad-tags";
import { sendPageView } from "../domain/ad-events";
import { useCookieConsent } from "./use-cookie-consent";

const adTagConfig = readAdTagConfigFromEnv();

/**
 * Loads Google Ads and Meta Pixel only after the visitor accepted advertising
 * and measurement cookies and only for the IDs configured in this environment.
 */
export function AdMeasurementTags() {
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  const allowed = consent.status === "decided" && consent.ads;
  const { googleAdsId, metaPixelId } = adTagConfig;

  useEffect(() => {
    if (allowed) {
      sendPageView(pathname);
    }
  }, [allowed, pathname]);

  if (!allowed || (!googleAdsId && !metaPixelId)) {
    return null;
  }

  return (
    <>
      {googleAdsId ? (
        <>
          <Script
            id="google-ads-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${googleAdsId}',{send_page_view:false});`}
          </Script>
        </>
      ) : null}
      {metaPixelId ? (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');`}
        </Script>
      ) : null}
    </>
  );
}
