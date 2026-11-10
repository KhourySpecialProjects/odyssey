const {
  togglePlaylistEnrollment,
  enrollInPlaylist,
} = require("../../lib/requests/playlist-enrollment");

const { getCurrentUser } = require("../../lib/auth/session");
const {
  getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");
const { CACHE_TAGS } = require("../../lib/cache-tags");
const {
  resolveDocumentId,
  strapiEntryUrl,
} = require("../../lib/strapi-document-id");

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

global.fetch = jest.fn();

// Non-identity mapping (5 -> "doc5") proves URLs and relation values are
// documentIds, not numeric ids.
const toDoc = (ref) => {
  const v = ref && typeof ref === "object" ? ref.documentId ?? ref.id : ref;
  return `doc${v}`;
};

beforeEach(() => {
  resolveDocumentId.mockImplementation(async (_c, ref) => toDoc(ref));
  strapiEntryUrl.mockImplementation(
    async (c, ref) =>
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${c}/${toDoc(ref)}`,
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("Playlist Enrollment Tests", () => {
  const { revalidateTag } = require("next/cache");

  describe("togglePlaylistEnrollment", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
    });

    it("successfully enrolls (connect) when user is NOT enrolled", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({
        id: 5,
        playlists: [{ id: 10 }, { id: 20 }],
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await togglePlaylistEnrollment(99);

      expect(result).toEqual({ success: true });
      // The fetched user is passed as an entity, so no id lookup is needed.
      expect(strapiEntryUrl).toHaveBeenCalledWith(
        "authorized-users",
        expect.objectContaining({ id: 5 }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/doc5"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                connect: ["doc99"],
              },
            },
          }),
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-5");
    });

    it("scopes dashboard/user invalidation to the acting user", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({ id: 5, playlists: [] });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      await togglePlaylistEnrollment(99);

      // playlists stays global: playlist reads carry authorized_users, which
      // is how the playlist page decides "enrolled".
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.playlists);
      // The cached record read that decides connect/disconnect next time
      expect(revalidateTag).toHaveBeenCalledWith(
        CACHE_TAGS.user("test@northeastern.edu"),
      );
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userDashboard(5));
      expect(revalidateTag).not.toHaveBeenCalledWith(
        CACHE_TAGS.allUserDashboards,
      );
      // No enrollment record changes, so no global enrollments sweep
      expect(revalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.allEnrollments);
    });

    it("successfully unenrolls (disconnect) when user IS enrolled", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({
        id: 5,
        playlists: [{ id: 10 }, { id: 42 }],
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await togglePlaylistEnrollment(42);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/doc5"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                disconnect: ["doc42"],
              },
            },
          }),
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-5");
    });

    it("fails when user is not authenticated", async () => {
      getCurrentUser.mockResolvedValue(null);

      const result = await togglePlaylistEnrollment(99);

      expect(result).toEqual({
        success: false,
        error: "Failed to update enrollment",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("fails when API returns an error response", async () => {
      getCurrentUser.mockResolvedValue({ email: "test@northeastern.edu" });
      getAuthorizedUserByEmail.mockResolvedValue({
        id: 5,
        playlists: [],
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await togglePlaylistEnrollment(99);

      expect(result).toEqual({
        success: false,
        error: "Failed to update enrollment",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("enrollInPlaylist", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
    });

    it("successfully enrolls and revalidates tags", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 7 } }),
      });

      const result = await enrollInPlaylist(55, 7);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/doc7"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                connect: ["doc55"],
              },
            },
          }),
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-7");
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userDashboard(7));
      expect(revalidateTag).not.toHaveBeenCalledWith(
        CACHE_TAGS.allUserDashboards,
      );
      expect(revalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.allEnrollments);
    });

    it("fails when API returns an error response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await enrollInPlaylist(55, 7);

      expect(result).toEqual({
        success: false,
        error: "Failed to enroll in playlist",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("fails on network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await enrollInPlaylist(55, 7);

      expect(result).toEqual({
        success: false,
        error: "Failed to enroll in playlist",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
