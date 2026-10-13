"use client";

import type { ComponentProps } from "react";

import { useCookieConsent } from "./use-cookie-consent";

export function CookiePreferencesButton({
  children = "Preferências de cookies",
  ...props
}: Omit<ComponentProps<"button">, "onClick" | "type">) {
  const { openPreferences } = useCookieConsent();

  return (
    <button {...props} onClick={openPreferences} type="button">
      {children}
    </button>
  );
}
