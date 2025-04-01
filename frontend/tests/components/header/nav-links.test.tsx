import { render, screen } from "@testing-library/react";
import { NavLinks } from "@/components/header/nav-links";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("NavLinks", () => {
  const mockItems = [
    { href: "/feed", label: "Feed" },
    { href: "/explore", label: "Explore" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/explore");
  });

  it("renders all navigation items", () => {
    render(<NavLinks items={mockItems} />);
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Feed")).toBeInTheDocument();
  });

  it("applies active styles to current path", () => {
    render(<NavLinks items={mockItems} />);
    expect(screen.getByText("Explore").parentElement).toHaveClass("font-bold");
  });
});
