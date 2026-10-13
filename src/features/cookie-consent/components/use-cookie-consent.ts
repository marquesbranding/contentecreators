"use client";

import { useSyncExternalStore } from "react";

import {
  SERVER_CONSENT_SNAPSHOT,
  getConsentSnapshot,
  getPreferencesOpen,
  saveConsent,
  setPreferencesOpen,
  subscribeToConsent,
  subscribeToPreferences,
} from "../domain/consent-store";

export function useCookieConsent() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    () => SERVER_CONSENT_SNAPSHOT,
  );
  const preferencesOpen = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesOpen,
    () => false,
  );

  return {
    acceptAds: () => saveConsent(true),
    closePreferences: () => setPreferencesOpen(false),
    consent,
    openPreferences: () => setPreferencesOpen(true),
    preferencesOpen,
    rejectAds: () => saveConsent(false),
    savePreferences: (ads: boolean) => saveConsent(ads),
  };
}
