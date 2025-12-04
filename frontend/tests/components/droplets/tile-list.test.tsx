import { render, screen } from "@testing-library/react";
import DraggableTileList from "@/components/droplets/draggable_tile_list";

jest.mock("@/components/droplets/draggable_tile_list_client", () => ({
  DraggableTileListClient: jest.fn(() => null),
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

  const mockProps = {
    droplets: mockDroplets as any,
    onDropToOther: jest.fn(),
    onReorder: jest.fn(),
    listType: "source" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders droplet list", () => {
    render(<DraggableTileList droplets={mockDroplets as any} />);
    expect(screen.getByTestId("droplet-list")).toBeInTheDocument();
  });

  it("renders with correct container classes", () => {
    const { container } = render(<DraggableTileList {...mockProps} />);

    expect(container.firstChild).toHaveClass("min-h-[200px]");
    expect(container.firstChild).toHaveClass("rounded-lg");
  });

  it("passes correct props to DraggableTileListClient", () => {
    const DraggableTileListClient =
      require("@/components/droplets/draggable_tile_list_client").DraggableTileListClient;

    render(<DraggableTileList {...mockProps} />);

    expect(DraggableTileListClient).toHaveBeenCalledWith(
      expect.objectContaining({
        droplets: mockDroplets,
        onReorder: mockProps.onReorder,
        listType: mockProps.listType,
      }),
      {},
    );
  });

  it("handles empty droplet list", () => {
    render(<DraggableTileList droplets={[]} />);

    expect(screen.getByTestId("droplet-list")).toBeInTheDocument();
  });

  it("handles selected list type", () => {
    render(<DraggableTileList droplets={mockDroplets as any} />);

    expect(screen.getByTestId("droplet-list")).toBeInTheDocument();
  });
});
