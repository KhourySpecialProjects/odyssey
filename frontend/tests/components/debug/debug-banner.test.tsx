import { render, screen } from "@testing-library/react";
import { DebugBanner } from "@/components/debug/debugBanner";
import useDebugStore from "@/stores/debug-toggle-store";

jest.mock("@/stores/debug-toggle-store", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("DebugBanner", () => {
  it("renders when debug mode is enabled", () => {
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: true });
    });

    render(<DebugBanner />);

    expect(screen.getByText("< Debug Mode Enabled >")).toBeInTheDocument();
  });

  it("does not render when debug mode is disabled", () => {
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: false });
    });

    const { container } = render(<DebugBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("applies custom class names correctly", () => {
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ debugModeEnabled: true });
    });

    render(<DebugBanner className="test-class" />);

    const banner = screen.getByText("< Debug Mode Enabled >").parentElement;
    expect(banner).toHaveClass("test-class");
  });
});
