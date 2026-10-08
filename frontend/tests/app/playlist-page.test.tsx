/** Playlist page only loads listed droplets. */
import PlaylistPage from "@/app/(playlists)/p/[slug]/page";
import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { getCachedEnrollmentsWithLessonIds } from "@/lib/requests/cached";
import { LISTED_DROPLET_FILTER } from "@/lib/droplet-visibility";

jest.mock("@/lib/requests/playlist", () => ({ getPlaylistBySlug: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn(),
}));
jest.mock("@/lib/requests/cached", () => ({
  getCachedEnrollmentsWithLessonIds: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: () => null,
}));
jest.mock("@/components/playlists/playlist-enroll-button", () => ({
  PlaylistEnrollButton: () => null,
}));

describe("PlaylistPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "a@b.edu" });
    (getAuthorizedUserId as jest.Mock).mockResolvedValue(1);
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([]);
    (getPlaylistBySlug as jest.Mock).mockResolvedValue({
      id: 1,
      name: "P",
      slug: "p",
      isPublic: true,
      droplets: [],
    });
  });

  it("requests only listed droplets", async () => {
    await PlaylistPage({ params: Promise.resolve({ slug: "p" }) });

    const options = (getPlaylistBySlug as jest.Mock).mock.calls[0][1];
    expect(options.populate.droplets.filters).toEqual(LISTED_DROPLET_FILTER);
  });
});
