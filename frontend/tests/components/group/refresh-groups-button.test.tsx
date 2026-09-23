"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefreshGroupsButton } from "@/components/group/refresh-groups-button";
import { refreshUserGroups } from "@/lib/requests/groups";
import { toast } from "sonner";

jest.mock("@/lib/requests/groups", () => ({
  refreshUserGroups: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("RefreshGroupsButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders an enabled Refresh button with no aria-busy", () => {
    render(<RefreshGroupsButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).toHaveAttribute("aria-disabled", "false");
  });

  it("shows the pending state while refreshing, then resolves on success", async () => {
    let resolvePromise: (value: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolvePromise = resolve;
    });
    (refreshUserGroups as jest.Mock).mockReturnValue(pending);

    render(<RefreshGroupsButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    const button = screen.getByRole("button", { name: /refreshing/i });
    // Focus must NOT be dropped for keyboard users: aria-disabled is a
    // presentational hint, not the DOM `disabled` attribute.
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");

    resolvePromise!({ ok: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
    });
    expect(toast.success).toHaveBeenCalledWith("Groups refreshed");
  });

  it("shows an error toast and re-enables the button when the action returns an error", async () => {
    (refreshUserGroups as jest.Mock).mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });

    render(<RefreshGroupsButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't refresh groups. Please try again.",
      );
    });
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
  });

  it("shows an error toast and re-enables the button when the action rejects", async () => {
    (refreshUserGroups as jest.Mock).mockRejectedValue(
      new Error("network error"),
    );

    render(<RefreshGroupsButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't refresh groups. Please try again.",
      );
    });
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
  });

  it("only calls refreshUserGroups once when clicked twice while pending", async () => {
    let resolvePromise: (value: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolvePromise = resolve;
    });
    (refreshUserGroups as jest.Mock).mockReturnValue(pending);

    render(<RefreshGroupsButton />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /refresh/i });
    // The button is never given the DOM `disabled` attribute, so both clicks
    // actually reach the onClick handler. It's the useRef in-flight guard
    // inside the component, not native disabled-button click suppression,
    // that must stop the second call from going through.
    await user.click(button);
    await user.click(screen.getByRole("button", { name: /refreshing/i }));

    expect(refreshUserGroups).toHaveBeenCalledTimes(1);

    resolvePromise!({ ok: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
    });
  });

  it("keeps keyboard focus on the button while pending and after it resolves", async () => {
    let resolvePromise: (value: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolvePromise = resolve;
    });
    (refreshUserGroups as jest.Mock).mockReturnValue(pending);

    render(<RefreshGroupsButton />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /refresh/i });
    button.focus();
    expect(document.activeElement).toBe(button);

    await user.keyboard("{Enter}");

    const pendingButton = screen.getByRole("button", { name: /refreshing/i });
    expect(document.activeElement).toBe(pendingButton);

    resolvePromise!({ ok: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /^refresh$/i }),
    );
  });
});
