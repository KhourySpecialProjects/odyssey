import {
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
  archivePlaylist,
} from "@/lib/requests/playlist";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

describe("createPlaylist", () => {
  const mockPlaylistData = {
    name: "New Playlist",
    isPublic: true,
    description: "test",
    droplets: [{ id: 1 }],
    author: { id: 123 },
    userId: 123,
  };

  it("successfully creates a playlist", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: mockPlaylistData }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await createPlaylist(mockPlaylistData);

    expect(revalidateTag).toHaveBeenCalledWith("playlists");
    expect(result).toEqual({
      ok: true,
      error: null,
      data: mockPlaylistData,
    });
  });

  it("handles playlist creation failure", async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: { message: "Creation failed" } }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await createPlaylist(mockPlaylistData);

    expect(result).toEqual({
      ok: false,
      error: "Creation failed",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("updatePlaylist", () => {
  const mockPlaylistData = {
    name: "Test Playlist",
    isPublic: true,
    description: "test",
    droplets: [{ id: 1 }],
    userId: 123,
    slug: "test-playlist",
  };

  it("successfully updates a playlist", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: mockPlaylistData }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await updatePlaylist(123, mockPlaylistData);

    expect(revalidateTag).toHaveBeenCalledWith("playlists");
    expect(result).toEqual({
      ok: true,
      error: null,
      data: mockPlaylistData,
    });
  });

  it("handles playlist update failure", async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: { message: "Update failed" } }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await updatePlaylist(123, mockPlaylistData);

    expect(result).toEqual({
      ok: false,
      error: "Update failed",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("Playlist Actions", () => {
  it("should create a playlist", async () => {
    const mockPlaylistData = {
      name: "Test Playlist",
      isPublic: true,
      description: "test",
      droplets: [{ id: 1 }],
      author: { id: 1 },
      userId: 1,
    };

    const result = await createPlaylist(mockPlaylistData);
    expect(result).toBeDefined();
  });

  it("should update a playlist", async () => {
    const mockUpdateData = {
      name: "Updated Playlist",
      isPublic: false,
      description: "test",
      droplets: [{ id: 1 }],
      authors: { id: 1 },
      userId: 1,
    };

    const result = await updatePlaylist(1, mockUpdateData);
    expect(result).toBeDefined();
  });

  it("should delete a playlist", async () => {
    const result = await deletePlaylist(1);
    expect(result).toBeDefined();
  });
});

describe("deletePlaylist", () => {
  it("successfully deletes a playlist and revalidates tags", async () => {
    // Mock getPlaylistById (fetch for GET)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { id: 123, attributes: { name: "Test" } } }),
    });
    // Mock the DELETE fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 123 } }),
    });

    const result = await deletePlaylist(123);

    expect(result).toEqual({ ok: true, error: null, data: { id: 123 } });
    expect(revalidateTag).toHaveBeenCalledWith("playlists");
    expect(revalidateTag).toHaveBeenCalledWith("authors");
    expect(revalidateTag).toHaveBeenCalledWith("groups");
  });

  it("handles playlist deletion failure", async () => {
    const mockResponse = { ok: false };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await deletePlaylist(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Playlist.",
    });
  });
});

describe("archivePlaylist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "test@example.com",
    });
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({ id: 5 });
  });

  it("successfully archives a playlist and revalidates", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { id: 10 } })),
    });

    const mockPlaylist = {
      id: 10,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: true,
      duration: "short" as const,
    };
    const result = await archivePlaylist(mockPlaylist, true);

    expect(result).toEqual({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith("playlists");
  });

  it("successfully unarchives a playlist and revalidates", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { id: 10 } })),
    });

    const mockPlaylist = {
      id: 10,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: true,
      duration: "short" as const,
    };
    const result = await archivePlaylist(mockPlaylist, false);

    expect(result).toEqual({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith("playlists");
  });

  it("does not revalidate on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Bad Request"),
      status: 400,
    });

    const mockPlaylist = {
      id: 10,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: true,
      duration: "short" as const,
    };
    const result = await archivePlaylist(mockPlaylist, true);

    expect(result).toEqual({ success: false, error: expect.any(Error) });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
