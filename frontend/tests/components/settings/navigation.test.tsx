import { render, screen } from "@testing-library/react";
import { SettingsNavigation } from "@/components/settings/navigation";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("SettingsNavigation", () => {
  const mockItems = [
    { href: "/settings/profile", label: "Profile" },
    { href: "/settings/account", label: "Account", isHidden: false },
    { href: "/settings/hidden", label: "Hidden", isHidden: true },
  ];

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/settings/profile");
  });

  it("renders visible navigation items", () => {
    render(<SettingsNavigation items={mockItems} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("highlights current path", () => {
    render(<SettingsNavigation items={mockItems} />);
    expect(screen.getByText("Profile")).toHaveClass("text-sky-600");
  });
});
