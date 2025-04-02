import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistList } from "@/components/group/group-management-playlist-list";

jest.mock("react-dnd", () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

describe("PlaylistList", () => {
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };
  const mockPlaylists = [mockPlaylist];

  const mockOnReorder = jest.fn();
  const mockOnRemove = jest.fn();

  it("renders playlists with correct information", () => {
    render(
      <PlaylistList
        playlists={mockPlaylists}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <PlaylistList
        playlists={mockPlaylists}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />,
    );

    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[0]);

    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });

  test("renders playlist items correctly", () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    render(
      <PlaylistList
        playlists={mockPlaylists}
        onReorder={onReorder}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  test("handles remove action", () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    render(
      <PlaylistList
        playlists={mockPlaylists}
        onReorder={onReorder}
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByRole("button");
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  test("displays correct droplet count", () => {
    const onReorder = jest.fn();
    const onRemove = jest.fn();

    render(
      <PlaylistList
        playlists={mockPlaylists}
        onReorder={onReorder}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("0 droplets")).toBeInTheDocument();
  });
});
