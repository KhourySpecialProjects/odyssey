import { render, screen } from "@testing-library/react";
import { DebugBanner } from "@/components/debug/debugBanner";
import useDebugStore from "@/stores/debug-toggle-store";

// Mock the debug store
jest.mock("@/stores/debug-toggle-store", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("DebugBanner", () => {
  it("renders when debug mode is enabled", () => {
    // Mock the debug store to return true for debugModeEnabled
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: true });
    });

    render(<DebugBanner />);

    // Check that the banner is rendered with the correct text
    expect(screen.getByText("< Debug Mode Enabled >")).toBeInTheDocument();
  });

  it("does not render when debug mode is disabled", () => {
    // Mock the debug store to return false for debugModeEnabled
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: false });
    });

    const { container } = render(<DebugBanner />);

    // Check that the component returns null (no elements rendered)
    expect(container).toBeEmptyDOMElement();
  });

  it("applies custom class names correctly", () => {
    // Mock the debug store to return true for debugModeEnabled
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: true });
    });

    render(<DebugBanner className="test-class" />);

    // Check that the custom class is applied
    const banner = screen.getByText("< Debug Mode Enabled >").parentElement;
    expect(banner).toHaveClass("test-class");
  });
});
