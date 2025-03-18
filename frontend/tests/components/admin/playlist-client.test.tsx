import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistClient } from "@/components/admin/playlists/playlist-client";

// Mock PlaylistBlock component
jest.mock("@/components/admin/playlists/playlist-block", () => ({
  PlaylistBlock: ({ playlist }: { playlist: any }) => (
    <div data-testid={`playlist-${playlist.id}`}>{playlist.name}</div>
  ),
}));

describe("PlaylistClient", () => {
  const mockPlaylists = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Playlist ${i + 1}`,
    slug: `playlist-${i + 1}`,
    isPublic: i % 2 === 0,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  }));

  it("renders a list of playlists", () => {
    render(<PlaylistClient playlists={mockPlaylists.slice(0, 5)} />);

    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-5")).toBeInTheDocument();
  });

  it("displays pagination correctly", () => {
    render(<PlaylistClient playlists={mockPlaylists} />);

    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-10")).toBeInTheDocument();
    expect(screen.queryByTestId("playlist-11")).not.toBeInTheDocument();

    expect(screen.getByText("Next")).toBeInTheDocument();
    const prevButton = screen.getByText("Previous");
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeDisabled();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(<PlaylistClient playlists={mockPlaylists} />);

    fireEvent.click(screen.getByText("Next"));

    expect(screen.queryByTestId("playlist-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("playlist-11")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-15")).toBeInTheDocument();

    expect(screen.getByText("Previous")).toBeInTheDocument();
    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(<PlaylistClient playlists={mockPlaylists} />);

    fireEvent.click(screen.getByText("Next"));

    fireEvent.click(screen.getByText("Previous"));

    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-10")).toBeInTheDocument();
    expect(screen.queryByTestId("playlist-11")).not.toBeInTheDocument();
  });

  it("displays a message when there are no playlists", () => {
    render(<PlaylistClient playlists={[]} />);

    expect(
      screen.getByText("There are no created playlists."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });
});
