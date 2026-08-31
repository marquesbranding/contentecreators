"use client";

import { createContext, useContext } from "react";

const BackofficeAccessContext = createContext(false);

/**
 * True when the signed-in identity also owns an ADMIN account linked to the
 * same login — an admin testing their own creator/company profile. Resolved
 * once per request in `app/(product)/app/layout.tsx` and read here instead of
 * threaded as a prop through every `/app/*` page.
 */
export function BackofficeAccessProvider({
  children,
  hasBackofficeAccess,
}: {
  children: React.ReactNode;
  hasBackofficeAccess: boolean;
}) {
  return (
    <BackofficeAccessContext.Provider value={hasBackofficeAccess}>
      {children}
    </BackofficeAccessContext.Provider>
  );
}

export function useBackofficeAccess() {
  return useContext(BackofficeAccessContext);
}
