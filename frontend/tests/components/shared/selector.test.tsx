import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSelector } from "@/components/shared/selector";

// Create a variable to track the current tab
let currentTab = "Tab 1";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn((url) => {
      const match = url.match(/adminTab=([^&]*)/);
      if (match) {
        currentTab = decodeURIComponent(match[1]);
      }
    }),
  })),
  usePathname: jest.fn(() => "/admin"),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((param) => {
      if (param === "adminTab") {
        return currentTab;
      }
      return null;
    }),
  })),
}));

// Tests for the AdminSelector component
describe("AdminSelector", () => {
  const mockContent = {
    "Tab 1": <div>Content 1</div>,
    "Tab 2": <div>Content 2</div>,
  };

  // Reset currentTab before each test
  beforeEach(() => {
    currentTab = "Tab 1";
  });

  it("renders all tabs", () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
  });

  it("shows first tab content by default", () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText("Content 1")).toBeInTheDocument();
  });

  it("applies correct styling to selected tab", () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText("Tab 1")).toHaveClass("bg-slate-200");
  });
});
