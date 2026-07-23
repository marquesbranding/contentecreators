import { describe, expect, it } from "vitest";

import { createAppStore } from "@/shared/store/app-store";

describe("createAppStore", () => {
  it("isolates UI state between server requests", () => {
    const firstRequest = createAppStore();
    const secondRequest = createAppStore();

    firstRequest.getState().openMobileNavigation();

    expect(firstRequest.getState().mobileNavigationOpen).toBe(true);
    expect(secondRequest.getState().mobileNavigationOpen).toBe(false);
  });

  it("exposes narrow UI commands without remote or identity state", () => {
    const store = createAppStore();

    store.getState().openDialog("sign-in");
    expect(store.getState().activeDialog).toBe("sign-in");

    store.getState().closeDialog();
    expect(store.getState().activeDialog).toBeNull();
    expect(store.getState()).not.toHaveProperty("user");
    expect(store.getState()).not.toHaveProperty("role");
    expect(store.getState()).not.toHaveProperty("profile");
    expect(store.getState()).not.toHaveProperty("accessToken");
  });
});
