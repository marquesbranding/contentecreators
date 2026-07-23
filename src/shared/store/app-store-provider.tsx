"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";

import {
  createAppStore,
  type AppStore,
  type AppStoreState,
} from "@/shared/store/app-store";

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAppStore);

  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}

export function useAppStore<T>(selector: (state: AppStoreState) => T): T {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStore must be used inside ApplicationProvider.");
  }

  return useStore(store, selector);
}
