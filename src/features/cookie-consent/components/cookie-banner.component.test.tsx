import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookiePreferencesButton } from "./cookie-preferences-button.client";
import { CookieBanner } from "./cookie-banner.client";
import { CONSENT_COOKIE_NAME } from "../domain/consent-cookie";
import { setPreferencesOpen } from "../domain/consent-store";

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

describe("CookieBanner", () => {
  beforeEach(clearCookies);
  afterEach(() => {
    act(() => setPreferencesOpen(false));
    clearCookies();
  });

  it("asks on the first visit with equally prominent choices", () => {
    render(<CookieBanner />);

    const accept = screen.getByRole("button", { name: "Aceitar" });
    const reject = screen.getByRole("button", { name: "Recusar" });

    expect(accept.className).toBe(reject.className);
    expect(
      screen.getByRole("link", { name: "Aviso de cookies" }),
    ).toHaveAttribute("href", "/cookies");
  });

  it("stores acceptance and hides", async () => {
    render(<CookieBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }));

    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=`);
    expect(decodeURIComponent(document.cookie)).toContain('"ads":true');
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores refusal and hides", async () => {
    render(<CookieBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));

    expect(decodeURIComponent(document.cookie)).toContain('"ads":false');
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show again once a choice exists", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ ads: false, at: new Date().toISOString(), v: 1 }),
    )}; Path=/`;
    render(<CookieBanner />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets the visitor reopen preferences, shows the stored choice and saves a change", async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ ads: false, at: new Date().toISOString(), v: 1 }),
    )}; Path=/`;
    render(
      <>
        <CookiePreferencesButton />
        <CookieBanner />
      </>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Preferências de cookies" }),
    );
    const ads = screen.getByRole("checkbox", {
      name: /Publicidade e medição/u,
    });
    expect(ads).not.toBeChecked();

    await userEvent.click(ads);
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar preferências" }),
    );

    expect(decodeURIComponent(document.cookie)).toContain('"ads":true');
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes preferences with Escape without saving", async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ ads: true, at: new Date().toISOString(), v: 1 }),
    )}; Path=/`;
    render(
      <>
        <CookiePreferencesButton />
        <CookieBanner />
      </>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Preferências de cookies" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(decodeURIComponent(document.cookie)).toContain('"ads":true');
  });
});
