import { render, screen } from "@testing-library/react";
import { ContentSection } from "@/components/group/content-section";

describe("ContentSection", () => {
  it("renders title", () => {
    render(<ContentSection title="Test Section" />);
    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("renders content when provided", () => {
    render(<ContentSection title="Test" content="Test content" />);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders empty message when no content", () => {
    render(<ContentSection title="Test" emptyMessage="No content" />);
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("renders children when provided", () => {
    render(
      <ContentSection title="Test">
        <div>Child content</div>
      </ContentSection>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders children when content is not provided", () => {
    render(
      <ContentSection title="Test Section">
        <div data-testid="child-content">Child Content</div>
      </ContentSection>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });
});
