import { render, screen } from "@testing-library/react";
import { StatisticsSelector } from "@/components/admin/statistics-selector";

// Create a variable to track the current statsTab
let currentStatsTab = "General Statistics";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn((url) => {
      const match = url.match(/statsTab=([^&]*)/);
      if (match) {
        currentStatsTab = decodeURIComponent(match[1]);
      }
    }),
  })),
  usePathname: jest.fn(() => "/admin"),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((param) => {
      if (param === "statsTab") {
        return currentStatsTab;
      }
      return null;
    }),
  })),
}));

// Tests for the StatisticsSelector component
describe("StatisticsSelector", () => {
  const mockContent = {
    "General Statistics": <div>Stats Content</div>,
    "Daily Active Users": <div>DAU Content</div>,
    "Weekly Active Users": <div>WAU Content</div>,
  };

  beforeEach(() => {
    currentStatsTab = "General Statistics";
  });

  it("renders all tabs", () => {
    render(<StatisticsSelector content={mockContent} />);
    expect(screen.getByText("General Statistics")).toBeInTheDocument();
    expect(screen.getByText("Daily Active Users")).toBeInTheDocument();
    expect(screen.getByText("Weekly Active Users")).toBeInTheDocument();
  });

  it("shows first tab content by default", () => {
    render(<StatisticsSelector content={mockContent} />);
    expect(screen.getByText("Stats Content")).toBeInTheDocument();
  });

  it("applies correct styling to selected tab", () => {
    render(<StatisticsSelector content={mockContent} />);
    expect(screen.getByText("General Statistics")).toHaveClass("bg-slate-200");
  });
});
