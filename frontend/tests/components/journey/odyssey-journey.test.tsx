import { render, screen, within } from "@testing-library/react";
import { OdysseyJourney } from "@/components/journey/odyssey-journey";
import { CHAPTERS } from "@/components/journey/journey-config";

function mockReducedMotion(reduce: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe("OdysseyJourney", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion(false);
  });

  it("tells the story through a heading for every chapter", () => {
    render(<OdysseyJourney />);

    expect(
      screen.getByRole("heading", { level: 2, name: "The Odyssey journey" }),
    ).toBeInTheDocument();
    CHAPTERS.forEach((chapter) => {
      expect(
        screen.getByRole("heading", { level: 3, name: chapter.title }),
      ).toBeInTheDocument();
    });
  });

  it("offers a way to skip the scroll sequence", () => {
    render(<OdysseyJourney />);

    expect(
      screen.getByRole("link", { name: "Skip the journey" }),
    ).toHaveAttribute("href", "#after-odyssey-journey");
  });

  it("ends with links to Explore and About", () => {
    render(<OdysseyJourney />);
    const section = document.getElementById("odyssey-journey") as HTMLElement;
    const links = within(section).getAllByRole("link", { hidden: true });

    expect(
      links.find((l) => l.textContent?.includes("Explore Odyssey")),
    ).toHaveAttribute("href", "/explore");
    expect(
      links.find((l) => l.textContent?.includes("Learn about Odyssey")),
    ).toHaveAttribute("href", "/about");
  });

  // The homepage hero owns these links; duplicates would break its tests
  // and give screen readers two identical links.
  it("doesn't repeat the hero's calls to action", () => {
    render(<OdysseyJourney />);

    expect(
      screen.queryByRole("link", { name: /Start Exploring/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Request Access/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the UI replicas out of the accessibility tree", () => {
    render(<OdysseyJourney />);

    // Replica headings like the Explore page title are decorative.
    expect(
      screen.queryByRole("heading", { name: "Explore" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows a static storyboard when reduced motion is preferred", () => {
    mockReducedMotion(true);
    render(<OdysseyJourney />);

    expect(
      screen.queryByRole("link", { name: "Skip the journey" }),
    ).not.toBeInTheDocument();
    CHAPTERS.forEach((chapter) => {
      expect(
        screen.getByRole("heading", { level: 3, name: chapter.title }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /Explore Odyssey/ }),
    ).toHaveAttribute("href", "/explore");
    expect(
      screen.getByText("Names and content shown are examples."),
    ).toBeInTheDocument();
  });
});
