"use client";

import { useEffect } from "react";

import { trackRegistrationCompleted } from "../domain/ad-events";
import { useCookieConsent } from "./use-cookie-consent";

const FIRED_KEY = "cc_registration_tracked";

/**
 * Sends the registration conversion once per browser session, only when the
 * visitor accepted advertising and measurement cookies.
 */
export function RegistrationCompletedTracker({ active }: { active: boolean }) {
  const { consent } = useCookieConsent();
  const accepted = consent.status === "decided" && consent.ads;

  useEffect(() => {
    if (!active || !accepted) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(FIRED_KEY)) {
        return;
      }
      window.sessionStorage.setItem(FIRED_KEY, "1");
    } catch {
      // Storage unavailable: still send once for this mount.
    }

    trackRegistrationCompleted();
  }, [accepted, active]);

  return null;
}
