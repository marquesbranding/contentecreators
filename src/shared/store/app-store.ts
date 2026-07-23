import { createStore } from "zustand/vanilla";

export type AppDialog = "mobile-navigation" | "sign-in";

export type AppStoreState = {
  activeDialog: AppDialog | null;
  mobileNavigationOpen: boolean;
  closeDialog: () => void;
  closeMobileNavigation: () => void;
  openDialog: (dialog: AppDialog) => void;
  openMobileNavigation: () => void;
};

export function createAppStore() {
  return createStore<AppStoreState>()((set) => ({
    activeDialog: null,
    mobileNavigationOpen: false,
    closeDialog: () => set({ activeDialog: null }),
    closeMobileNavigation: () => set({ mobileNavigationOpen: false }),
    openDialog: (activeDialog) => set({ activeDialog }),
    openMobileNavigation: () => set({ mobileNavigationOpen: true }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
