import { vi } from "vitest";

export function createSearchParamsFixture(
  entries: string | Record<string, string> = "",
) {
  return new URLSearchParams(entries);
}

export function createRouterFixture() {
  return {
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn<(href: string) => void>(),
    push: vi.fn<(href: string) => void>(),
    refresh: vi.fn(),
    replace: vi.fn<(href: string) => void>(),
  };
}
