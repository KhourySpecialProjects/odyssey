import { render, screen } from "@testing-library/react";
import { PlaylistBlock } from "@/components/admin/playlists/playlist-block";

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe("PlaylistBlock", () => {
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };

  it("renders playlist name correctly", () => {
    render(<PlaylistBlock playlist={mockPlaylist} />);
    expect(screen.getByText("Test Playlist")).toBeInTheDocument();
  });

  it("shows (Public) text when playlist is public", () => {
    const publicPlaylist = { ...mockPlaylist, isPublic: true };
    render(<PlaylistBlock playlist={publicPlaylist} />);
    expect(screen.getByText("Test Playlist (Public)")).toBeInTheDocument();
  });

  it("links to the correct edit URL", () => {
    render(<PlaylistBlock playlist={mockPlaylist} />);
    const editLink = screen.getByRole("link");
    expect(editLink).toHaveAttribute("href", "/draft/p/test-playlist");
  });

  it("has an edit button with a pencil icon", () => {
    render(<PlaylistBlock playlist={mockPlaylist} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    const tooltip = screen.getByText("Edit Playlist");
    expect(tooltip).toBeInTheDocument();
  });
});
