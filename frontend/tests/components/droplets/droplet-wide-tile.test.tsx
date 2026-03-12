import { render, screen } from "@testing-library/react";
import DraggableDropletWideTile from "@/components/droplets/draggable-droplet-wide-tile";
import { Droplet } from "@/types";

jest.mock("@/lib/utils", () => ({
  uppercaseFirstChar: (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("DraggableDropletWideTile", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    status: "draft",
    focusArea: "technical",
    type: "knowledge",
    isHidden: false,
    learningObjectives: [],
    tags: [
      { id: 1, slug: "tag-1", name: "Tag 1", droplets: [] },
      { id: 2, slug: "tag-2", name: "Tag 2", droplets: [] },
    ],
  } as unknown as Droplet;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders droplet name", () => {
      render(<DraggableDropletWideTile droplet={mockDroplet} index={0} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("renders all badges correctly", () => {
      render(<DraggableDropletWideTile droplet={mockDroplet} index={0} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Technical")).toBeInTheDocument();
      expect(screen.getByText("Knowledge")).toBeInTheDocument();
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });
  });

  describe("Draft Badge", () => {
    it("shows Draft badge for draft status", () => {
      render(<DraggableDropletWideTile droplet={mockDroplet} index={0} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("does not show Draft badge for published status", () => {
      const publishedDroplet = { ...mockDroplet, status: "published" as const };

      render(<DraggableDropletWideTile droplet={publishedDroplet} index={0} />);

      expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    });
  });

  describe("Tags", () => {
    it("renders multiple tags", () => {
      render(<DraggableDropletWideTile droplet={mockDroplet} index={0} />);

      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("handles droplet with no tags", () => {
      const noTagsDroplet = { ...mockDroplet, tags: [] };

      render(<DraggableDropletWideTile droplet={noTagsDroplet} index={0} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles droplet with undefined tags", () => {
      const undefinedTagsDroplet = { ...mockDroplet, tags: undefined };

      render(
        <DraggableDropletWideTile droplet={undefinedTagsDroplet} index={0} />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct container classes", () => {
      const { container } = render(
        <DraggableDropletWideTile droplet={mockDroplet} index={0} />,
      );

      const card = container.firstChild?.firstChild as HTMLElement;
      expect(card).toHaveClass("rounded-md");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-slate-50");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long droplet name", () => {
      const longNameDroplet = { ...mockDroplet, name: "A".repeat(200) };

      render(<DraggableDropletWideTile droplet={longNameDroplet} index={0} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });

    it("handles droplet at different indexes", () => {
      render(<DraggableDropletWideTile droplet={mockDroplet} index={5} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles different action types", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet}
          index={0}
          actionType="add"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });
  });
});
