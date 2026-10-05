import { render, screen, act } from "@testing-library/react";
import { FooterWave } from "@/components/footer/footer-wave";

jest.mock("react-wavify", () => ({
  __esModule: true,
  default: ({ paused }: { paused?: boolean }) => (
    <div data-testid="animated-wave" data-paused={String(paused)} />
  ),
}));

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe("FooterWave", () => {
  let observerCallback: ObserverCallback | null;
  const disconnect = jest.fn();
  const originalIntersectionObserver = window.IntersectionObserver;

  const setVisible = (isIntersecting: boolean) =>
    act(() => observerCallback?.([{ isIntersecting }]));

  const mockReducedMotion = (matches: boolean) => {
    (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  };

  beforeEach(() => {
    observerCallback = null;
    window.IntersectionObserver = jest.fn((callback: ObserverCallback) => {
      observerCallback = callback;
      return { observe: jest.fn(), disconnect };
    }) as unknown as typeof IntersectionObserver;
    mockReducedMotion(false);
  });

  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it("renders a static wave until the footer is known to be visible", () => {
    const { container } = render(<FooterWave />);

    expect(screen.queryByTestId("animated-wave")).not.toBeInTheDocument();
    expect(container.querySelector("path")).toHaveAttribute("fill", "#2F5569");
  });

  it("animates while the footer is in view and stops when it leaves", () => {
    render(<FooterWave />);

    setVisible(true);
    expect(screen.getByTestId("animated-wave")).toHaveAttribute(
      "data-paused",
      "false",
    );

    setVisible(false);
    expect(screen.queryByTestId("animated-wave")).not.toBeInTheDocument();
  });

  it("keeps the wave paused when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    render(<FooterWave />);

    setVisible(true);
    expect(screen.getByTestId("animated-wave")).toHaveAttribute(
      "data-paused",
      "true",
    );
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<FooterWave />);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
