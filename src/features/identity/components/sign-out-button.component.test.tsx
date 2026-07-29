import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getBrowserQueryClient } from "@/shared/query/browser-query-client";

import { SignOutButton } from "./sign-out-button.client";

describe("sign-out button", () => {
  it("removes protected browser data before terminating the session", async () => {
    const queryClient = getBrowserQueryClient();
    queryClient.clear();
    queryClient.setQueryData(["catalog", "protected"], {
      creatorName: "Protected creator",
    });
    const action = vi.fn(async () => undefined);

    render(<SignOutButton action={action} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Sair da conta" }).closest("form")!,
    );

    await waitFor(() => {
      expect(
        queryClient.getQueryData(["catalog", "protected"]),
      ).toBeUndefined();
    });
  });
});
