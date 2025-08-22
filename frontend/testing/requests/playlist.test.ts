import { createPlaylist, deletePlaylist, updatePlaylist } from "@/lib/requests/playlist";
import { revalidateTag } from "next/cache";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe("createPlaylist", () => {
  const mockPlaylistData = {
    name: "New Playlist",
    isPublic: true,
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
      json: () =>
        Promise.resolve({ error: { message: "Creation failed" } }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await createPlaylist(mockPlaylistData);

    expect(result).toEqual({
      ok: false,
      error: "Creation failed",
      data: null,
    });
  });
});

describe("updatePlaylist", () => {
  const mockPlaylistData = {
    name: "Test Playlist",
    isPublic: true,
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
  });
});

describe("Playlist Actions", () => {
  it("should create a playlist", async () => {
    const mockPlaylistData = {
      name: "Test Playlist",
      isPublic: true,
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
  it("handles playlist deletion failure", async () => {
    const mockResponse = { ok: false };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await deletePlaylist(123);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Playlist.",
    });
  });
});