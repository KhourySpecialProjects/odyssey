import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import SettingsLayout from "@/app/(general)/settings/layout";
import { getCurrentUser } from "@/lib/auth/session";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  notFound: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

describe("SettingsLayout", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/settings/notes");
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "user@example.com",
    });
  });

  it("gives small screens tabs for the settings pages the side nav hides", async () => {
    render(await SettingsLayout({ children: <p>page</p> }));

    const tabs = screen.getByRole("navigation", { name: "Settings sections" });
    expect(tabs).toHaveClass("md:hidden");
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/settings", "/settings/friends", "/settings/notes"]);
    expect(within(tabs).getByRole("link", { name: "Notes" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // The side nav is still there for md and up
    expect(
      screen.getByRole("navigation", { name: "Settings navigation" }),
    ).toHaveClass("hidden", "md:flex");
  });
});
