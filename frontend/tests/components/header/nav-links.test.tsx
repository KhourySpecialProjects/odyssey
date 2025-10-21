import { render, screen, fireEvent } from "@testing-library/react";
import { NavLinks } from "@/components/header/nav-links";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  };
});

describe("NavLinks", () => {
  const mockItems = [
    { href: "/feed", label: "Feed" },
    { href: "/explore", label: "Explore" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/explore");
  });

  describe("Rendering", () => {
    it("renders all navigation items", () => {
      render(<NavLinks items={mockItems} />);

      expect(screen.getByText("Explore")).toBeInTheDocument();
      expect(screen.getByText("Feed")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("renders navigation items as links", () => {
      render(<NavLinks items={mockItems} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      const exploreLink = screen.getByRole("link", { name: "Explore" });
      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });

      expect(feedLink).toHaveAttribute("href", "/feed");
      expect(exploreLink).toHaveAttribute("href", "/explore");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("renders items in an unordered list", () => {
      const { container } = render(<NavLinks items={mockItems} />);

      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
    });

    it("renders each item in a list item element", () => {
      const { container } = render(<NavLinks items={mockItems} />);

      const listItems = container.querySelectorAll("li");
      expect(listItems).toHaveLength(3);
    });

    it("applies default flex class to list", () => {
      const { container } = render(<NavLinks items={mockItems} />);

      const ul = container.querySelector("ul");
      expect(ul).toHaveClass("flex");
    });

    it("applies custom className when provided", () => {
      const { container } = render(
        <NavLinks items={mockItems} className="custom-class" />,
      );

      const ul = container.querySelector("ul");
      expect(ul).toHaveClass("flex", "custom-class");
    });
  });

  describe("Active State", () => {
    it("applies active styles to current path", () => {
      render(<NavLinks items={mockItems} />);

      const exploreLi = screen.getByText("Explore").closest("li");
      expect(exploreLi).toHaveClass("font-bold");
    });

    it("applies active link styles to current path", () => {
      render(<NavLinks items={mockItems} />);

      const exploreLink = screen.getByRole("link", { name: "Explore" });
      expect(exploreLink).toHaveClass("rounded");
      expect(exploreLink).toHaveClass("bg-sky-700");
      expect(exploreLink).toHaveClass("font-bold");
      expect(exploreLink).toHaveClass("text-white");
    });

    it("does not apply active styles to non-current paths", () => {
      render(<NavLinks items={mockItems} />);

      const feedLi = screen.getByText("Feed").closest("li");
      expect(feedLi).not.toHaveClass("font-bold");
    });

    it("applies inactive link styles to non-current paths", () => {
      render(<NavLinks items={mockItems} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      expect(feedLink).toHaveClass("rounded");
      expect(feedLink).toHaveClass("text-slate-900");
    });

    it("highlights active link when pathname matches exactly", () => {
      (usePathname as jest.Mock).mockReturnValue("/feed");

      render(<NavLinks items={mockItems} />);

      const feedLi = screen.getByText("Feed").closest("li");
      expect(feedLi).toHaveClass("font-bold");
    });

    it("highlights active link when pathname starts with item href", () => {
      (usePathname as jest.Mock).mockReturnValue("/explore/droplets");

      render(<NavLinks items={mockItems} />);

      const exploreLi = screen.getByText("Explore").closest("li");
      expect(exploreLi).toHaveClass("font-bold");
    });

    it("handles query parameters in href when checking active state", () => {
      const itemsWithQuery = [
        { href: "/feed?tab=recent", label: "Feed" },
        { href: "/explore", label: "Explore" },
      ];

      (usePathname as jest.Mock).mockReturnValue("/feed");

      render(<NavLinks items={itemsWithQuery} />);

      const feedLi = screen.getByText("Feed").closest("li");
      expect(feedLi).toHaveClass("font-bold");
    });
  });

  describe("Link Click Handling", () => {
    it("calls onLinkClick when a link is clicked", () => {
      const onLinkClick = jest.fn();

      render(<NavLinks items={mockItems} onLinkClick={onLinkClick} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      fireEvent.click(feedLink);

      expect(onLinkClick).toHaveBeenCalled();
    });

    it("calls onLinkClick for each link independently", () => {
      const onLinkClick = jest.fn();

      render(<NavLinks items={mockItems} onLinkClick={onLinkClick} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      const exploreLink = screen.getByRole("link", { name: "Explore" });

      fireEvent.click(feedLink);
      expect(onLinkClick).toHaveBeenCalledTimes(1);

      fireEvent.click(exploreLink);
      expect(onLinkClick).toHaveBeenCalledTimes(2);
    });

    it("does not call onLinkClick when not provided", () => {
      render(<NavLinks items={mockItems} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });

      // Should not throw error when clicking
      expect(() => fireEvent.click(feedLink)).not.toThrow();
    });

    it("handles rapid link clicks", () => {
      const onLinkClick = jest.fn();

      render(<NavLinks items={mockItems} onLinkClick={onLinkClick} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      fireEvent.click(feedLink);
      fireEvent.click(feedLink);
      fireEvent.click(feedLink);

      expect(onLinkClick).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases", () => {
    it("renders empty list when no items provided", () => {
      const { container } = render(<NavLinks items={[]} />);

      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
      expect(ul?.children).toHaveLength(0);
    });

    it("handles items with special characters in labels", () => {
      const specialItems = [{ href: "/test", label: "Test & <Special>" }];

      render(<NavLinks items={specialItems} />);

      expect(screen.getByText("Test & <Special>")).toBeInTheDocument();
    });

    it("handles items with very long labels", () => {
      const longLabelItems = [
        {
          href: "/test",
          label:
            "This is a very long navigation label that might cause layout issues",
        },
      ];

      render(<NavLinks items={longLabelItems} />);

      expect(
        screen.getByText(
          "This is a very long navigation label that might cause layout issues",
        ),
      ).toBeInTheDocument();
    });

    it("handles multiple items with same label", () => {
      const duplicateItems = [
        { href: "/feed1", label: "Feed" },
        { href: "/feed2", label: "Feed" },
      ];

      render(<NavLinks items={duplicateItems} />);

      const feedLinks = screen.getAllByText("Feed");
      expect(feedLinks).toHaveLength(2);
    });

    it("handles hrefs with hash fragments", () => {
      const itemsWithHash = [{ href: "/feed#top", label: "Feed" }];

      render(<NavLinks items={itemsWithHash} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      expect(feedLink).toHaveAttribute("href", "/feed#top");
    });

    it("handles root path correctly", () => {
      const rootItem = [{ href: "/", label: "Home" }];

      (usePathname as jest.Mock).mockReturnValue("/");

      render(<NavLinks items={rootItem} />);

      const homeLi = screen.getByText("Home").closest("li");
      expect(homeLi).toHaveClass("font-bold");
    });

    it("handles nested paths correctly", () => {
      const nestedItems = [
        { href: "/settings", label: "Settings" },
        { href: "/settings/profile", label: "Profile" },
      ];

      (usePathname as jest.Mock).mockReturnValue("/settings/profile/edit");

      render(<NavLinks items={nestedItems} />);

      // Both should be highlighted since pathname starts with their hrefs
      const settingsLi = screen.getByText("Settings").closest("li");
      const profileLi = screen.getByText("Profile").closest("li");

      expect(settingsLi).toHaveClass("font-bold");
      expect(profileLi).toHaveClass("font-bold");
    });

    it("handles complex query parameters", () => {
      const itemsWithComplexQuery = [
        { href: "/search?q=test&filter=all&sort=date", label: "Search" },
      ];

      (usePathname as jest.Mock).mockReturnValue("/search");

      render(<NavLinks items={itemsWithComplexQuery} />);

      const searchLi = screen.getByText("Search").closest("li");
      expect(searchLi).toHaveClass("font-bold");
    });
  });

  describe("Styling", () => {
    it("applies block and padding classes to all links", () => {
      render(<NavLinks items={mockItems} />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveClass("block");
        expect(link).toHaveClass("px-3");
        expect(link).toHaveClass("py-2");
      });
    });

    it("applies rounded class to all links", () => {
      render(<NavLinks items={mockItems} />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveClass("rounded");
      });
    });

    it("applies different styles for active and inactive links", () => {
      (usePathname as jest.Mock).mockReturnValue("/feed");

      render(<NavLinks items={mockItems} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      const exploreLink = screen.getByRole("link", { name: "Explore" });

      // Active link styles
      expect(feedLink).toHaveClass("bg-sky-700");
      expect(feedLink).toHaveClass("font-bold");
      expect(feedLink).toHaveClass("text-white");

      // Inactive link styles
      expect(exploreLink).toHaveClass("text-slate-900");
      expect(exploreLink).toHaveClass("rounded");
    });
  });

  describe("Accessibility", () => {
    it("all links have accessible text", () => {
      render(<NavLinks items={mockItems} />);

      const feedLink = screen.getByRole("link", { name: "Feed" });
      const exploreLink = screen.getByRole("link", { name: "Explore" });

      expect(feedLink).toHaveAccessibleName("Feed");
      expect(exploreLink).toHaveAccessibleName("Explore");
    });

    it("uses list structure for navigation", () => {
      const { container } = render(<NavLinks items={mockItems} />);

      const ul = container.querySelector("ul");
      const listItems = container.querySelectorAll("li");

      expect(ul).toBeInTheDocument();
      expect(listItems).toHaveLength(mockItems.length);
    });

    it("maintains proper DOM hierarchy", () => {
      const { container } = render(<NavLinks items={mockItems} />);

      const ul = container.querySelector("ul");
      const firstLi = ul?.firstElementChild;
      const firstLink = firstLi?.firstElementChild;

      expect(firstLink?.tagName).toBe("A");
    });
  });
});
