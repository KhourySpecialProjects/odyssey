import { render, screen } from "@testing-library/react";
import { AdminNav } from "@/components/admin/admin-nav";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/admin"),
}));

const { usePathname } = jest.requireMock("next/navigation");

describe("AdminNav", () => {
  const NAV_LABELS = [
    "Dashboard",
    "Users",
    "Droplets",
    "Playlists",
    "Groups",
    "Access Manager",
    "Creators Manager",
    "Reports",
  ];

  beforeEach(() => {
    usePathname.mockReturnValue("/admin");
  });

  it("renders all 8 nav items", () => {
    render(<AdminNav />);
    NAV_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("marks Dashboard active when pathname is /admin", () => {
    usePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks Users active when pathname is /admin/users", () => {
    usePathname.mockReturnValue("/admin/users");
    render(<AdminNav />);
    const link = screen.getByRole("link", { name: /^users$/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks no item active when property1 is 'Default' and pathname has no match", () => {
    usePathname.mockReturnValue("/some/other/path");
    render(<AdminNav property1="Default" />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current", "page");
    });
  });

  it("overrides pathname detection when property1 is set", () => {
    usePathname.mockReturnValue("/admin"); // would normally make Dashboard active
    render(<AdminNav property1="Reports" />);

    const reportsLink = screen.getByRole("link", { name: /reports/i });
    expect(reportsLink).toHaveAttribute("aria-current", "page");

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).not.toHaveAttribute("aria-current", "page");
  });

  it("each nav item links to the correct href", () => {
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: /^users$/i })).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getByRole("link", { name: /droplets/i })).toHaveAttribute(
      "href",
      "/admin/droplets",
    );
    expect(screen.getByRole("link", { name: /playlists/i })).toHaveAttribute(
      "href",
      "/admin/playlists",
    );
    expect(screen.getByRole("link", { name: /groups/i })).toHaveAttribute(
      "href",
      "/admin/groups",
    );
    expect(
      screen.getByRole("link", { name: /access manager/i }),
    ).toHaveAttribute("href", "/admin/access-manager");
    expect(
      screen.getByRole("link", { name: /creators manager/i }),
    ).toHaveAttribute("href", "/admin/creators-manager");
    expect(screen.getByRole("link", { name: /reports/i })).toHaveAttribute(
      "href",
      "/admin/reports",
    );
  });
});
