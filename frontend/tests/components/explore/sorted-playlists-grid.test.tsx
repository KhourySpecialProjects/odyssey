import { fireEvent, render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { SortedPlaylistsGrid } from "@/components/explore/sorted-playlists-grid";
import type { Playlist } from "@/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useSearchParams: jest.fn(),
}));

jest.mock("@/components/playlists/playlist-card", () => ({
  PlaylistCard: ({ playlist }: { playlist: Playlist }) => (
    <article>{playlist.name}</article>
  ),
}));

jest.mock("@/contexts/SearchContext", () => ({
  useSearch: () => ({ searchQuery: "" }),
}));

// 20 playlists, 9 per page
const names = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `Playlist ${from + i}`);
const playlists = names(1, 20).map(
  (name, i) => ({ id: i + 1, name }) as unknown as Playlist,
);

const renderGrid = (query: string) => {
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(query));
  return render(<SortedPlaylistsGrid playlistsWithCompletion={playlists} />);
};

const shownNames = () =>
  screen.getAllByRole("article").map((card) => card.textContent);

describe("SortedPlaylistsGrid paging (ODY-865)", () => {
  let pushStateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    pushStateSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
  });

  it.each<[string, string, string[]]>([
    ["no page", "", names(1, 9)],
    ["page 2, which survives mounting", "page=2", names(10, 18)],
    ["a page past the end, as the last page", "page=99", names(19, 20)],
  ])("shows %s", (_label, query, expected) => {
    renderGrid(query);
    expect(shownNames()).toEqual(expected);
    // Mounting must never move the page (the old reset-to-1 effect did)
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("writes the chosen page into the URL", () => {
    renderGrid("contentType=playlists");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?contentType=playlists&page=2",
    );
  });
});
