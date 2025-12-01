import { render, screen } from "@testing-library/react";
import DraggableDropletWideTile from "@/components/droplets/draggable-droplet-wide-tile";

jest.mock("@/lib/utils", () => ({
  uppercaseFirstChar: (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("DraggableDropletWideTile", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    status: "draft" as const,
    focusArea: "frontend" as const,
    type: "tutorial" as const,
    tags: [
      { id: 1, name: "Tag 1" },
      { id: 2, name: "Tag 2" },
    ],
  };

  const mockMoveCard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders droplet name", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("renders all badges correctly", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.getByText("Tutorial")).toBeInTheDocument();
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });
  });

  describe("Draft Badge", () => {
    it("shows Draft badge for draft status", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("does not show Draft badge for published status", () => {
      const publishedDroplet = { ...mockDroplet, status: "published" as const };

      render(
        <DraggableDropletWideTile
          droplet={publishedDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    });
  });

  describe("Tags", () => {
    it("renders multiple tags", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("handles droplet with no tags", () => {
      const noTagsDroplet = { ...mockDroplet, tags: [] };

      render(
        <DraggableDropletWideTile
          droplet={noTagsDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles droplet with undefined tags", () => {
      const undefinedTagsDroplet = { ...mockDroplet, tags: undefined };

      render(
        <DraggableDropletWideTile
          droplet={undefinedTagsDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct container classes", () => {
      const { container } = render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(container.firstChild).toHaveClass("rounded-md");
      expect(container.firstChild).toHaveClass("border");
      expect(container.firstChild).toHaveClass("bg-slate-50");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long droplet name", () => {
      const longNameDroplet = { ...mockDroplet, name: "A".repeat(200) };

      render(
        <DraggableDropletWideTile
          droplet={longNameDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });

    it("handles droplet at different indexes", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={5}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles different source lists", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="different-list"
        />,
      );

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });
  });
});
