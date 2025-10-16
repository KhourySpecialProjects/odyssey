import { render, screen } from "@testing-library/react";
import DraggableDropletWideTile from "@/components/droplets/draggable-droplet-wide-tile";
import { useDrag, useDrop } from "react-dnd";

jest.mock("react-dnd", () => ({
  useDrag: jest.fn(),
  useDrop: jest.fn(),
}));

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
    (useDrag as jest.Mock).mockReturnValue([{ isDragging: false }, jest.fn()]);
    (useDrop as jest.Mock).mockReturnValue([{}, jest.fn()]);
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

    it("renders grip icon", () => {
      const { container } = render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const gripIcon = container.querySelector(".lucide-grip-vertical");
      expect(gripIcon).toBeInTheDocument();
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

  describe("Drag and Drop", () => {
    it("applies opacity-50 when dragging", () => {
      (useDrag as jest.Mock).mockReturnValue([{ isDragging: true }, jest.fn()]);

      const { container } = render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(container.firstChild).toHaveClass("opacity-50");
    });

    it("does not apply opacity when not dragging", () => {
      (useDrag as jest.Mock).mockReturnValue([
        { isDragging: false },
        jest.fn(),
      ]);

      const { container } = render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(container.firstChild).not.toHaveClass("opacity-50");
    });

    it("configures useDrag with correct type", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(useDrag).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DROPTILE",
        }),
      );
    });

    it("configures useDrop with correct accept type", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      expect(useDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          accept: "DROPTILE",
        }),
      );
    });

    it("hover does nothing when same index", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const hoverHandler = (useDrop as jest.Mock).mock.calls[0][0].hover;
      const mockItem = { index: 0, sourceList: "test" };

      hoverHandler(mockItem);

      expect(mockMoveCard).not.toHaveBeenCalled();
    });

    it("hover does nothing when different source list", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const hoverHandler = (useDrop as jest.Mock).mock.calls[0][0].hover;
      const mockItem = { index: 1, sourceList: "different" };

      hoverHandler(mockItem);

      expect(mockMoveCard).not.toHaveBeenCalled();
    });

    it("hover calls moveCard when different index and same source", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const hoverHandler = (useDrop as jest.Mock).mock.calls[0][0].hover;
      const mockItem = { index: 1, sourceList: "test" };

      hoverHandler(mockItem);

      expect(mockMoveCard).toHaveBeenCalledWith(1, 0);
      expect(mockItem.index).toBe(0);
    });

    it("handles drag end with no drop result", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const endHandler = (useDrag as jest.Mock).mock.calls[0][0].end;
      const mockMonitor = { getDropResult: jest.fn().mockReturnValue(null) };

      endHandler({ index: 0, droplet: mockDroplet }, mockMonitor);

      expect(mockMonitor.getDropResult).toHaveBeenCalled();
    });

    it("handles drag end with drop result", () => {
      render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const endHandler = (useDrag as jest.Mock).mock.calls[0][0].end;
      const mockMonitor = {
        getDropResult: jest.fn().mockReturnValue({ moved: true }),
      };

      endHandler({ index: 0, droplet: mockDroplet }, mockMonitor);

      expect(mockMonitor.getDropResult).toHaveBeenCalled();
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

    it("grip icon has correct styling", () => {
      const { container } = render(
        <DraggableDropletWideTile
          droplet={mockDroplet as any}
          index={0}
          moveCard={mockMoveCard}
          sourceList="test"
        />,
      );

      const grip = container.querySelector(".cursor-grab");
      expect(grip).toHaveClass("z-10");
      expect(grip).toHaveClass("text-slate-400");
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
