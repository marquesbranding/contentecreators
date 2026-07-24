import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

function GuardHarness() {
  const [enabled, setEnabled] = useState(false);
  useUnsavedChangesGuard(enabled);

  return (
    <button onClick={() => setEnabled(true)} type="button">
      Proteger saída
    </button>
  );
}

describe("useUnsavedChangesGuard", () => {
  it("prevents browser navigation only while unsaved changes exist", () => {
    render(<GuardHarness />);
    const unprotectedEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unprotectedEvent);
    expect(unprotectedEvent.defaultPrevented).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Proteger saída" }));
    const protectedEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(protectedEvent);
    expect(protectedEvent.defaultPrevented).toBe(true);
  });
});
