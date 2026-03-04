import { render, screen, fireEvent } from "@testing-library/react";
import { StatisticsSelector } from "@/components/admin/statistics-selector";

describe("StatisticsSelector", () => {
  const mockContent = {
    "General Statistics": <div>Stats Content</div>,
    "Daily Active Users": <div>DAU Content</div>,
    "Weekly Active Users": <div>WAU Content</div>,
  };

  describe("Rendering", () => {
    it("renders all tabs", () => {
      render(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("General Statistics")).toBeInTheDocument();
      expect(screen.getByText("Daily Active Users")).toBeInTheDocument();
      expect(screen.getByText("Weekly Active Users")).toBeInTheDocument();
    });

    it("shows first tab content by default", () => {
      render(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("Stats Content")).toBeInTheDocument();
      expect(screen.queryByText("DAU Content")).not.toBeInTheDocument();
      expect(screen.queryByText("WAU Content")).not.toBeInTheDocument();
    });

    it("renders correct content when clicking a different tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(screen.getByText("DAU Content")).toBeInTheDocument();
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct styling to selected tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      const selectedTab = screen.getByText("General Statistics");
      expect(selectedTab).toHaveClass("bg-slate-200");
      expect(selectedTab).toHaveClass("dark:text-black");
    });

    it("applies hover styling to unselected tabs", () => {
      render(<StatisticsSelector content={mockContent} />);

      const unselectedTab = screen.getByText("Daily Active Users");
      expect(unselectedTab).toHaveClass("hover:bg-slate-100");
      expect(unselectedTab).toHaveClass("dark:hover:text-black");
      expect(unselectedTab).not.toHaveClass("bg-slate-200");
    });

    it("applies cursor-pointer to all tabs", () => {
      render(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("General Statistics")).toHaveClass(
        "cursor-pointer",
      );
      expect(screen.getByText("Daily Active Users")).toHaveClass(
        "cursor-pointer",
      );
      expect(screen.getByText("Weekly Active Users")).toHaveClass(
        "cursor-pointer",
      );
    });
  });

  describe("Tab Navigation", () => {
    it("switches content when clicking on a different tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(screen.getByText("DAU Content")).toBeInTheDocument();
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
    });

    it("switches content when clicking on another tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Weekly Active Users"));

      expect(screen.getByText("WAU Content")).toBeInTheDocument();
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
    });

    it("updates selected tab styling on click", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(screen.getByText("Daily Active Users")).toHaveClass(
        "bg-slate-200",
      );
      expect(screen.getByText("General Statistics")).not.toHaveClass(
        "bg-slate-200",
      );
    });

    it("can navigate through all tabs", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));
      expect(screen.getByText("DAU Content")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Weekly Active Users"));
      expect(screen.getByText("WAU Content")).toBeInTheDocument();

      fireEvent.click(screen.getByText("General Statistics"));
      expect(screen.getByText("Stats Content")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty content object", () => {
      render(<StatisticsSelector content={{}} />);

      expect(screen.queryByText("General Statistics")).not.toBeInTheDocument();
    });

    it("handles single tab", () => {
      const singleTabContent = {
        "Only Tab": <div>Single Content</div>,
      };

      render(<StatisticsSelector content={singleTabContent} />);

      expect(screen.getByText("Only Tab")).toBeInTheDocument();
      expect(screen.getByText("Single Content")).toBeInTheDocument();
    });

    it("handles tabs with special characters in names", () => {
      const specialContent = {
        "Tab & Special": <div>Special Content</div>,
      };

      render(<StatisticsSelector content={specialContent} />);

      expect(screen.getByText("Tab & Special")).toBeInTheDocument();
      expect(screen.getByText("Special Content")).toBeInTheDocument();
    });
  });

  describe("Multiple Renders", () => {
    it("updates content when tab changes", () => {
      render(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("Stats Content")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(screen.getByText("DAU Content")).toBeInTheDocument();
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
    });
  });
});
