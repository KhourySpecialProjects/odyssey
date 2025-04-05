import { render, screen } from "@testing-library/react";
import DraggableTileList from "@/components/droplets/draggable_tile_list";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

jest.mock("react-dnd", () => ({
  useDrop: jest.fn().mockImplementation(() => [{ isOver: false }, jest.fn()]),
  useDrag: jest
    .fn()
    .mockImplementation(() => [{ isDragging: false }, jest.fn()]),
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

jest.mock('@/components/droplets/draggable_tile_list_client', () => ({
  DraggableTileListClient: jest.fn(() => null)
}));

jest.mock("lib/utils", () => ({
  uppercaseFirstChar: (text: string) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : "",
  cn: (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" "),
}));

describe("DraggableTileList", () => {
  const mockDroplets = [
    { id: 1, name: "Droplet 1" },
    { id: 2, name: "Droplet 2" },
  ];

  beforeEach(() => {
    (useDrop as jest.Mock).mockReturnValue([{ isOver: false }, jest.fn()]);
  });

  it("renders droplet list", () => {
    render(
      <DraggableTileList
        droplets={mockDroplets as any}
        onDropToOther={jest.fn()}
        onReorder={jest.fn()}
        listType="source"
      />,
    );
    expect(screen.getByTestId("droplet-list")).toBeInTheDocument();
  });

  it("applies hover styles when dragging over", () => {
    (useDrop as jest.Mock).mockReturnValue([{ isOver: true }, jest.fn()]);

    const { container } = render(
      <DraggableTileList
        droplets={mockDroplets as any}
        onDropToOther={jest.fn()}
        onReorder={jest.fn()}
        listType="source"
      />,
    );
    expect(container.firstChild).toHaveClass("border-slate-400");
  });

  const mockProps = {
    droplets: mockDroplets as any,
    onDropToOther: jest.fn(),
    onReorder: jest.fn(),
    listType: "source" as const,
  };

  it("handles dropping items from different lists", () => {
    (useDrop as jest.Mock).mockImplementation(() => [
      {
        isOver: true,
      },
      jest.fn(),
    ]);

    const { container } = render(<DraggableTileList {...mockProps} />);

    const dropHandler = (useDrop as jest.Mock).mock.calls[0][0].drop;
    const mockItem = {
      droplet: mockDroplets[0],
      sourceList: "selected",
    };

    dropHandler(mockItem);

    expect(mockProps.onDropToOther).toHaveBeenCalledWith(mockDroplets[0]);
    expect(container.firstChild).toHaveClass(
      "border-slate-400",
      "bg-slate-100/50",
    );
  });

  it("prevents dropping from same list type", () => {
    render(<DraggableTileList {...mockProps} />);

    const canDrop = (useDrop as jest.Mock).mock.calls[0][0].canDrop;

    expect(canDrop({ sourceList: "source" })).toBe(false);
    expect(canDrop({ sourceList: "selected" })).toBe(true);
  });

})