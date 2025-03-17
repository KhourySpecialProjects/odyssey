import { render, screen, fireEvent } from "@testing-library/react";
import DebugToggle from "@/components/debug/toggle";
import useDebugStore from "@/stores/debug-toggle-store";

// Mock the debug store
jest.mock("@/stores/debug-toggle-store", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const originalNodeEnv = process.env.NODE_ENV;

describe("DebugToggle", () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDebugStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ toggle: mockToggle });
    });
  });

  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      configurable: true,
    });
  });

  it("renders in development environment", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });

    render(<DebugToggle />);

    expect(screen.getByRole("button", { name: "Debug" })).toBeInTheDocument();
  });

  it("does not render in production environment", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });

    const { container } = render(<DebugToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("calls toggle function when clicked", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });

    render(<DebugToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Debug" }));

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("applies custom class names correctly", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });

    render(<DebugToggle className="test-class" />);

    const button = screen.getByRole("button", { name: "Debug" });
    expect(button).toHaveClass("test-class");
  });

  it("passes through additional props", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });

    render(<DebugToggle data-testid="custom-prop" />);

    expect(screen.getByTestId("custom-prop")).toBeInTheDocument();
  });
});
