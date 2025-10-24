import { render, screen, fireEvent } from "@testing-library/react";
import { StatisticsSelector } from "@/components/admin/statistics-selector";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Create a variable to track the current statsTab
let currentStatsTab = "General Statistics";
const mockPush = jest.fn((url) => {
  const match = url.match(/statsTab=([^&]*)/);
  if (match) {
    currentStatsTab = decodeURIComponent(match[1]);
  }
});

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("StatisticsSelector", () => {
  const mockContent = {
    "General Statistics": <div>Stats Content</div>,
    "Daily Active Users": <div>DAU Content</div>,
    "Weekly Active Users": <div>WAU Content</div>,
  };

  beforeEach(() => {
    currentStatsTab = "General Statistics";
    mockPush.mockClear();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (usePathname as jest.Mock).mockReturnValue("/admin");

    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams(currentStatsTab ? `statsTab=${currentStatsTab}` : ""),
    );
  });

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

    it("renders correct content for current tab from URL", () => {
      currentStatsTab = "Daily Active Users";

      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("statsTab=Daily Active Users"),
      );

      render(<StatisticsSelector content={mockContent} />);

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
    it("updates URL when clicking on a different tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(mockPush).toHaveBeenCalledWith(
        "/admin?statsTab=Daily+Active+Users",
      );
    });

    it("updates URL when clicking on another tab", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Weekly Active Users"));

      expect(mockPush).toHaveBeenCalledWith(
        "/admin?statsTab=Weekly+Active+Users",
      );
    });

    it("preserves pathname when updating statsTab", () => {
      (usePathname as jest.Mock).mockReturnValue("/admin/dashboard");

      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/admin/dashboard"),
      );
    });

    it("creates query string correctly", () => {
      render(<StatisticsSelector content={mockContent} />);

      fireEvent.click(screen.getByText("Daily Active Users"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("statsTab="),
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty content object", () => {
      render(<StatisticsSelector content={{}} />);

      // Should render without crashing
      expect(screen.queryByText("General Statistics")).not.toBeInTheDocument();
    });

    it("handles single tab", () => {
      const singleTabContent = {
        "Only Tab": <div>Single Content</div>,
      };

      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("statsTab=Only Tab"),
      );

      render(<StatisticsSelector content={singleTabContent} />);

      expect(screen.getByText("Only Tab")).toBeInTheDocument();
      expect(screen.getByText("Single Content")).toBeInTheDocument();
    });

    it("defaults to first tab when statsTab param is invalid", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("statsTab=Invalid Tab Name"),
      );

      render(<StatisticsSelector content={mockContent} />);

      // Should show nothing since invalid tab doesn't exist
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
      expect(screen.queryByText("DAU Content")).not.toBeInTheDocument();
    });

    it("handles tabs with special characters in names", () => {
      const specialContent = {
        "Tab & Special": <div>Special Content</div>,
      };

      render(<StatisticsSelector content={specialContent} />);

      fireEvent.click(screen.getByText("Tab & Special"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("Tab+%26+Special"),
      );
    });
  });

  describe("Multiple Renders", () => {
    it("updates content when tab changes", () => {
      const { rerender } = render(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("Stats Content")).toBeInTheDocument();

      // Simulate tab change by updating the mock
      currentStatsTab = "Daily Active Users";
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("statsTab=Daily Active Users"),
      );

      rerender(<StatisticsSelector content={mockContent} />);

      expect(screen.getByText("DAU Content")).toBeInTheDocument();
      expect(screen.queryByText("Stats Content")).not.toBeInTheDocument();
    });
  });
});
