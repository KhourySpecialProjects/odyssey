"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefreshGroupButton } from "@/components/group/refresh-group-button";
import { refreshGroup } from "@/lib/requests/groups";
import { toast } from "sonner";

jest.mock("@/lib/requests/groups", () => ({ refreshGroup: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("RefreshGroupButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders an idle Refresh button", () => {
    render(<RefreshGroupButton slug="cs-101" />);
    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  it("calls the action with the slug, shows the busy state, then toasts success", async () => {
    let resolve!: (v: { ok: true }) => void;
    jest
      .mocked(refreshGroup)
      .mockReturnValue(new Promise((r) => (resolve = r)));

    render(<RefreshGroupButton slug="cs-101" />);
    await userEvent.setup().click(screen.getByRole("button"));

    expect(refreshGroup).toHaveBeenCalledWith("cs-101");
    const busy = screen.getByRole("button", { name: /refreshing/i });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");

    resolve({ ok: true });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled(),
    );
    expect(toast.success).toHaveBeenCalledWith("Group refreshed");
  });

  it("toasts an error when the action refuses", async () => {
    jest
      .mocked(refreshGroup)
      .mockResolvedValue({ ok: false, error: "forbidden" });

    render(<RefreshGroupButton slug="cs-101" />);
    await userEvent.setup().click(screen.getByRole("button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't refresh group. Please try again.",
      ),
    );
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
  });

  it("toasts an error when the action rejects", async () => {
    jest.mocked(refreshGroup).mockRejectedValue(new Error("network"));

    render(<RefreshGroupButton slug="cs-101" />);
    await userEvent.setup().click(screen.getByRole("button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't refresh group. Please try again.",
      ),
    );
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled();
  });

  it("calls the action once when clicked twice while pending", async () => {
    let resolve!: (v: { ok: true }) => void;
    jest
      .mocked(refreshGroup)
      .mockReturnValue(new Promise((r) => (resolve = r)));

    render(<RefreshGroupButton slug="cs-101" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /refreshing/i }));

    expect(refreshGroup).toHaveBeenCalledTimes(1);
    resolve({ ok: true });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^refresh$/i })).toBeEnabled(),
    );
  });
});
