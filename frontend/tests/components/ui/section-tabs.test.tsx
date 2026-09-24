import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { SectionTabs } from "@/components/ui/section-tabs";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("SectionTabs", () => {
  const items = [
    { href: "/settings", label: "General" },
    { href: "/settings/friends", label: "Friends" },
    { href: "/settings/hidden", label: "Hidden", isHidden: true },
  ];

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/settings/friends");
  });

  it("renders a labelled nav with a link per visible item", () => {
    render(<SectionTabs items={items} label="Settings sections" />);

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/settings",
      "/settings/friends",
    ]);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("marks only the current page's tab", () => {
    render(<SectionTabs items={items} label="Settings sections" />);

    const current = screen.getByRole("link", { name: "Friends" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("bg-[#287697]", "text-white");
    expect(screen.getByRole("link", { name: "General" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("scrolls horizontally instead of wrapping and passes className through", () => {
    render(
      <SectionTabs
        items={items}
        label="Settings sections"
        className="md:hidden"
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toHaveClass("md:hidden");
    expect(within(nav).getByRole("list")).toHaveClass("overflow-x-auto");
  });

  it("shows a badge with an accessible label when the count is positive", () => {
    render(
      <SectionTabs
        items={[
          {
            href: "/settings/friends",
            label: "Friends",
            badge: { count: 2, label: "pending requests" },
          },
        ]}
        label="Sections"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Friends 2 pending requests" }),
    ).toBeInTheDocument();
  });

  it("hides the badge when the count is zero", () => {
    render(
      <SectionTabs
        items={[
          {
            href: "/settings/friends",
            label: "Friends",
            badge: { count: 0, label: "pending requests" },
          },
        ]}
        label="Sections"
      />,
    );

    expect(screen.getByRole("link", { name: "Friends" })).toBeInTheDocument();
    expect(screen.queryByText(/pending requests/)).not.toBeInTheDocument();
  });
});
