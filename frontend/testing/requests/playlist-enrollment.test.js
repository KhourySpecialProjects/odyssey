const {
  togglePlaylistEnrollment,
  enrollInPlaylist,
} = require("../../lib/requests/playlist-enrollment");

const { getCurrentUser } = require("../../lib/auth/session");
const {
  getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");

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

beforeEach(() => {
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/authorized-users/5"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                connect: [99],
              },
            },
          }),
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-5");
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
        expect.stringContaining("/api/authorized-users/5"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                disconnect: [42],
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
        expect.stringContaining("/api/authorized-users/7"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            data: {
              playlists: {
                connect: [55],
              },
            },
          }),
        }),
      );
      expect(revalidateTag).toHaveBeenCalledWith("playlists");
      expect(revalidateTag).toHaveBeenCalledWith("enrollments-7");
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
