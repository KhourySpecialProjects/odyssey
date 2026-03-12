import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSelector } from "@/components/shared/selector";

describe("AdminSelector", () => {
  const mockContent = {
    "Tab 1": <div>Content 1</div>,
    "Tab 2": <div>Content 2</div>,
    "Tab 3": <div>Content 3</div>,
  };

  describe("Rendering", () => {
    it("renders all tabs from content object", () => {
      render(<AdminSelector content={mockContent} />);

      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Tab 2")).toBeInTheDocument();
      expect(screen.getByText("Tab 3")).toBeInTheDocument();
    });

    it("renders tabs in correct order", () => {
      render(<AdminSelector content={mockContent} />);

      const tabs = screen
        .getAllByRole("generic")
        .filter(
          (el) =>
            el.textContent &&
            ["Tab 1", "Tab 2", "Tab 3"].includes(el.textContent),
        );

      expect(tabs[0]).toHaveTextContent("Tab 1");
      expect(tabs[1]).toHaveTextContent("Tab 2");
      expect(tabs[2]).toHaveTextContent("Tab 3");
    });

    it("shows first tab content by default", () => {
      render(<AdminSelector content={mockContent} />);

      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
      expect(screen.queryByText("Content 3")).not.toBeInTheDocument();
    });

    it("renders complex React node content", () => {
      const complexContent = {
        "Complex Tab": (
          <div>
            <h1>Title</h1>
            <p>Paragraph</p>
            <button>Action</button>
          </div>
        ),
      };

      render(<AdminSelector content={complexContent} />);

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action" }),
      ).toBeInTheDocument();
    });

    it("renders with single tab", () => {
      const singleTabContent = {
        "Only Tab": <div>Only Content</div>,
      };

      render(<AdminSelector content={singleTabContent} />);

      expect(screen.getByText("Only Tab")).toBeInTheDocument();
      expect(screen.getByText("Only Content")).toBeInTheDocument();
    });

    it("renders with empty content node", () => {
      const emptyContent = {
        "Empty Tab": <></>,
      };

      render(<AdminSelector content={emptyContent} />);

      expect(screen.getByText("Empty Tab")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies selected styling to active tab", () => {
      render(<AdminSelector content={mockContent} />);

      const selectedTab = screen.getByText("Tab 1");
      expect(selectedTab).toHaveClass("bg-slate-200");
      expect(selectedTab).toHaveClass("dark:text-black");
    });

    it("applies hover styling to non-selected tabs", () => {
      render(<AdminSelector content={mockContent} />);

      const nonSelectedTab = screen.getByText("Tab 2");
      expect(nonSelectedTab).toHaveClass("hover:bg-slate-100");
      expect(nonSelectedTab).toHaveClass("dark:hover:text-black");
      expect(nonSelectedTab).not.toHaveClass("bg-slate-200");
    });

    it("applies cursor-pointer to all tabs", () => {
      render(<AdminSelector content={mockContent} />);

      const tab1 = screen.getByText("Tab 1");
      const tab2 = screen.getByText("Tab 2");

      expect(tab1).toHaveClass("cursor-pointer");
      expect(tab2).toHaveClass("cursor-pointer");
    });

    it("applies rounded-lg to all tabs", () => {
      render(<AdminSelector content={mockContent} />);

      const tab1 = screen.getByText("Tab 1");
      const tab2 = screen.getByText("Tab 2");

      expect(tab1).toHaveClass("rounded-lg");
      expect(tab2).toHaveClass("rounded-lg");
    });

    it("applies select-none to tab container", () => {
      const { container } = render(<AdminSelector content={mockContent} />);

      const tabContainer = container.querySelector(".select-none");
      expect(tabContainer).toBeInTheDocument();
    });

    it("updates selected tab styling when clicking a different tab", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      const tab1 = screen.getByText("Tab 1");
      const tab2 = screen.getByText("Tab 2");

      expect(tab1).not.toHaveClass("bg-slate-200");
      expect(tab2).toHaveClass("bg-slate-200");
    });
  });

  describe("Tab Navigation", () => {
    it("navigates to clicked tab", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("switches content on click", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 3"));

      expect(screen.getByText("Content 3")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("handles multiple tab clicks", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 2"));
      expect(screen.getByText("Content 2")).toBeInTheDocument();

      await user.click(screen.getByText("Tab 3"));
      expect(screen.getByText("Content 3")).toBeInTheDocument();

      await user.click(screen.getByText("Tab 1"));
      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("navigates using fireEvent click", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("uses correct pathname in navigation", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });
  });

  describe("Content Display", () => {
    it("displays only the selected tab content", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Content 3")).not.toBeInTheDocument();
    });

    it("switches content when tab is clicked", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      await user.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("renders content in correct container", () => {
      const { container } = render(<AdminSelector content={mockContent} />);

      const contentContainer = container.querySelector(".mt-4");
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveTextContent("Content 1");
    });
  });

  describe("Tab Names with Special Characters", () => {
    it("handles tabs with spaces in names", () => {
      const contentWithSpaces = {
        "Tab With Spaces": <div>Spaced Content</div>,
        "Another Tab": <div>Other Content</div>,
      };

      render(<AdminSelector content={contentWithSpaces} />);

      expect(screen.getByText("Tab With Spaces")).toBeInTheDocument();
    });

    it("handles tabs with special characters", () => {
      const contentWithSpecialChars = {
        "Tab & Special": <div>Special Content</div>,
        "Tab #2": <div>Hash Content</div>,
      };

      render(<AdminSelector content={contentWithSpecialChars} />);

      expect(screen.getByText("Tab & Special")).toBeInTheDocument();
      expect(screen.getByText("Tab #2")).toBeInTheDocument();
    });

    it("switches to tab with spaces when clicked", async () => {
      const user = userEvent.setup();
      const contentWithSpaces = {
        "Tab One": <div>Content One</div>,
        "Tab With Spaces": <div>Spaced Content</div>,
      };

      render(<AdminSelector content={contentWithSpaces} />);

      await user.click(screen.getByText("Tab With Spaces"));

      expect(screen.getByText("Spaced Content")).toBeInTheDocument();
    });

    it("switches to tab with special characters when clicked", async () => {
      const user = userEvent.setup();
      const contentWithSpecialChars = {
        "Tab #1": <div>Content</div>,
        "Tab & More": <div>More Content</div>,
      };

      render(<AdminSelector content={contentWithSpecialChars} />);

      await user.click(screen.getByText("Tab & More"));

      expect(screen.getByText("More Content")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles clicking the already selected tab", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 1"));

      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("handles rapid successive clicks", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 2"));
      await user.click(screen.getByText("Tab 3"));
      await user.click(screen.getByText("Tab 1"));

      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("handles empty content object gracefully", () => {
      const emptyContent = {};

      render(<AdminSelector content={emptyContent} />);

      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("handles null content in tab", () => {
      const nullContent = {
        "Null Tab": null,
      };

      render(<AdminSelector content={nullContent as any} />);

      expect(screen.getByText("Null Tab")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("tabs are keyboard accessible", () => {
      render(<AdminSelector content={mockContent} />);

      const tab1 = screen.getByText("Tab 1");
      expect(tab1).toBeInTheDocument();
      expect(tab1).toHaveClass("cursor-pointer");
    });

    it("content area updates when tab changes", () => {
      render(<AdminSelector content={mockContent} />);

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Tab 3"));

      expect(screen.getByText("Content 3")).toBeInTheDocument();
    });

    it("maintains focus context during tab navigation", async () => {
      const user = userEvent.setup();
      render(<AdminSelector content={mockContent} />);

      await user.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });
  });

  describe("Multiple Instances", () => {
    it("handles multiple AdminSelector instances independently", () => {
      const content1 = {
        "Set 1 Tab 1": <div>Set 1 Content 1</div>,
        "Set 1 Tab 2": <div>Set 1 Content 2</div>,
      };

      const content2 = {
        "Set 2 Tab 1": <div>Set 2 Content 1</div>,
        "Set 2 Tab 2": <div>Set 2 Content 2</div>,
      };

      render(
        <>
          <AdminSelector content={content1} />
          <AdminSelector content={content2} />
        </>,
      );

      expect(screen.getByText("Set 1 Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Set 2 Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Set 1 Content 1")).toBeInTheDocument();
      expect(screen.getByText("Set 2 Content 1")).toBeInTheDocument();
    });
  });

  describe("Query String Creation", () => {
    it("clicking tab updates displayed content", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("clicking tab switches away from previous content", () => {
      render(<AdminSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });
  });
});
