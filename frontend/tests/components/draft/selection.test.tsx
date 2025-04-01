import { render, screen, fireEvent } from "@testing-library/react";
import { Selection } from "@/components/draft/metadata/selection";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";

jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  useDropletUpdate: jest.fn(),
}));

jest.mock("@/components/new/multi-select", () => ({
  MultiSelect: ({ label, selected, setSelected }: any) => (
    <div data-testid="multi-select">
      <span>{label}</span>
      <button onClick={() => setSelected([{ id: 2, label: "New Item" }])}>
        Select Item
      </button>
      <div>
        {selected.map((item: any) => (
          <span key={item.id}>{item.label}</span>
        ))}
      </div>
    </div>
  ),
}));

describe("Selection", () => {
  const mockItems = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];

  const mockHandleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });
  });

  it("renders with prerequisite variant", () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="prerequisite"
      />,
    );
    expect(screen.getByText("Prerequisites")).toBeInTheDocument();
  });

  it("renders with postrequisite variant", () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="postrequisite"
      />,
    );
    expect(screen.getByText("Postrequisites")).toBeInTheDocument();
  });

  it("renders with tag variant", () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[mockItems[0]]}
        variant="tag"
      />,
    );
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("displays error message when present", () => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: "Test error",
      handleChange: mockHandleChange,
    });

    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={[]}
        variant="tag"
      />,
    );

    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  const mockSelectedItems = [{ id: 1, label: "Item 1", name: "item 1" }];

  beforeEach(() => {
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: jest.fn(),
    });
  });

  it("initializes with selected items", () => {
    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={mockSelectedItems}
        variant="tag"
      />,
    );

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("handles selection updates prerequisite", () => {
    const mockHandleChange = jest.fn();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });

    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={mockSelectedItems}
        variant="prerequisite"
      />,
    );

    fireEvent.click(screen.getByText("Select Item"));

    expect(mockHandleChange).toHaveBeenCalledWith({
      prerequisiteIds: [2],
    });
  });

  it("handles selection updates tag", () => {
    const mockHandleChange = jest.fn();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });

    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={mockSelectedItems}
        variant="tag"
      />,
    );

    fireEvent.click(screen.getByText("Select Item"));

    expect(mockHandleChange).toHaveBeenCalledWith({
      tagIds: [2],
    });
  });

  it("handles selection updates postrequisite", () => {
    const mockHandleChange = jest.fn();
    (useDropletUpdate as jest.Mock).mockReturnValue({
      error: null,
      handleChange: mockHandleChange,
    });

    render(
      <Selection
        dropletId={1}
        items={mockItems}
        selectedItems={mockSelectedItems}
        variant="postrequisite"
      />,
    );

    fireEvent.click(screen.getByText("Select Item"));

    expect(mockHandleChange).toHaveBeenCalledWith({
      postrequisiteIds: [2],
    });
  });
});
