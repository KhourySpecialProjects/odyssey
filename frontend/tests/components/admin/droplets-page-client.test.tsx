import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { updateDroplet } from "@/lib/requests/droplet";
import { DropletsPageClient } from "@/components/admin/droplets/droplets-page-client";
import { makeDroplet } from "@/lib/testing/mock-helpers";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("next/dynamic", () => () => () => null);

describe("DropletsPageClient visibility toasts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the archived copy when hiding", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    render(
      <DropletsPageClient
        droplets={[makeDroplet({ id: 1, name: "Alpha", isHidden: false })]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "hide droplet" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Alpha archived. No new learners can enroll",
      ),
    );
  });

  it("shows the visible-again copy when showing", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    render(
      <DropletsPageClient
        droplets={[makeDroplet({ id: 1, name: "Alpha", isHidden: true })]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "show droplet" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Alpha is visible again"),
    );
  });

  it("shows no success toast when the update fails", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: false, error: "x" });
    render(
      <DropletsPageClient
        droplets={[makeDroplet({ id: 1, name: "Alpha", isHidden: false })]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "hide droplet" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
