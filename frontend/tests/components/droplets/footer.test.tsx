import { render, screen } from "@testing-library/react";
import DropletFooter from "@/components/droplets/footer";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("DropletFooter", () => {
  const mockDroplet = {
    slug: "test-droplet",
    droplet_lessons: [
      { lesson: { slug: "lesson-1", name: "Lesson 1" } },
      { lesson: { slug: "lesson-2", name: "Lesson 2" } },
    ],
  };

  const mockDroplet2 = {
    slug: "test-droplet",
  };

  it("renders navigation for overview page", () => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");

    render(<DropletFooter droplet={mockDroplet as any} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();
  });

  it("renders navigation for middle lesson", () => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

    render(<DropletFooter droplet={mockDroplet as any} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Lesson 2")).toBeInTheDocument();
  });

  it("renders navigation for last lesson", () => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-2");

    render(<DropletFooter droplet={mockDroplet as any} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Recap")).toBeInTheDocument();
  });

  it("returns null when no droplet lessons", () => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-2");

    const { container } = render(
      <DropletFooter droplet={mockDroplet2 as any} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
