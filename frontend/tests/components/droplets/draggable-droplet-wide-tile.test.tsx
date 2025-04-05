import { render, screen } from "@testing-library/react";
import DraggableDropletWideTile from "@/components/droplets/draggable-droplet-wide-tile";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

jest.mock("react-dnd", () => ({
  useDrag: jest.fn(),
  useDrop: jest.fn(),
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

describe("DraggableDropletWideTile", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    status: "draft",
    focusArea: "frontend",
    type: "tutorial",
    tags: [{ id: 1, name: "Tag 1" }],
  };

  beforeEach(() => {
    (useDrag as jest.Mock).mockReturnValue([{ isDragging: false }, jest.fn()]);
    (useDrop as jest.Mock).mockReturnValue([{}, jest.fn()]);
  });

  it("renders droplet information correctly", () => {
    render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />,
    );

    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Tutorial")).toBeInTheDocument();
    expect(screen.getByText("Tag 1")).toBeInTheDocument();
  });

  it("applies dragging styles when isDragging is true", () => {
    (useDrag as jest.Mock).mockReturnValue([{ isDragging: true }, jest.fn()]);

    const { container } = render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />,
    );

    expect(container.firstChild).toHaveClass("opacity-50");
  });

  it("handles drag end correctly", () => {
    const mockMonitor = {
      getDropResult: jest.fn().mockReturnValue({ moved: true }),
    };

    render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />,
    );

    const endHandler = (useDrag as jest.Mock).mock.calls[0][0].end;
    endHandler({ index: 0, droplet: mockDroplet }, mockMonitor);

    expect(mockMonitor.getDropResult).toHaveBeenCalled();
  });

  it("handles hover with different indexes and same source list", () => {
    render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />,
    );

    const hoverHandler = (useDrop as jest.Mock).mock.calls[0][0].hover;
    const mockItem = {
      index: 1,
      sourceList: "source",
    };

    hoverHandler(mockItem);

    expect(mockItem.index).toBe(1);
  });
});
