import {
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
  archivePlaylist,
} from "@/lib/requests/playlist";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";

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

  it("scopes /my-content and /dashboard invalidation to the author", async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockPlaylistData }),
    });

    await createPlaylist(mockPlaylistData);

    // A new playlist has one author and no enrollees yet
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userContent(123));
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userDashboard(123));
    expect(revalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.allUserContent);
    expect(revalidateTag).not.toHaveBeenCalledWith(
      CACHE_TAGS.allUserDashboards,
    );
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

  const mockAuthorFetch = () =>
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { id: 10, attributes: { authors: { data: [{ id: 5 }] } } },
        }),
    });

  it("successfully archives a playlist and revalidates", async () => {
    mockAuthorFetch();
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
    mockAuthorFetch();
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
    mockAuthorFetch();
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

  it("rejects non-authors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { id: 10, attributes: { authors: { data: [{ id: 99 }] } } },
        }),
    });

    const mockPlaylist = {
      id: 10,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: true,
      duration: "short" as const,
    };
    const result = await archivePlaylist(mockPlaylist, true);

    expect(result.success).toBe(false);
  });
});

describe("documentId handling (ODY-601)", () => {
  const identity = (ref: any) =>
    ref && typeof ref === "object"
      ? ref.documentId ?? String(ref.id)
      : String(ref);
  const toDoc = (ref: any) =>
    ref && typeof ref === "object" && ref.documentId
      ? ref.documentId
      : "doc" + (typeof ref === "object" ? ref.id : ref);

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveDocumentId as jest.Mock).mockImplementation(async (_c, ref) =>
      toDoc(ref),
    );
    (resolveDocumentIds as jest.Mock).mockImplementation(async (_c, refs) =>
      refs.map(toDoc),
    );
    (strapiEntryUrl as jest.Mock).mockImplementation(
      async (collection, ref) =>
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${toDoc(ref)}`,
    );
  });

  afterEach(() => {
    (resolveDocumentId as jest.Mock).mockImplementation(async (_c, ref) =>
      identity(ref),
    );
    (resolveDocumentIds as jest.Mock).mockImplementation(async (_c, refs) =>
      refs.map(identity),
    );
    (strapiEntryUrl as jest.Mock).mockImplementation(
      async (collection, ref, query) =>
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${identity(ref)}${query ? `?${query}` : ""}`,
    );
  });

  const okResponse = {
    ok: true,
    json: () => Promise.resolve({ data: { id: 1 } }),
  };

  it("createPlaylist sends author and droplet documentIds", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse);

    await createPlaylist({
      name: "P",
      isPublic: true,
      description: "d",
      droplets: [{ id: 1 }, { id: 2 }],
      author: { id: 123 },
      userId: 123,
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data.authors).toEqual({ connect: ["doc123"] });
    expect(body.data.droplets).toEqual({ connect: ["doc1", "doc2"] });
  });

  it("createPlaylist uses the author entity's documentId", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse);

    await createPlaylist({
      name: "P",
      isPublic: true,
      description: "d",
      droplets: [],
      author: { id: 123, documentId: "authorDoc" } as any,
      userId: 123,
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.data.authors).toEqual({ connect: ["authorDoc"] });
  });

  it("createPlaylist returns an error result when a related entry is gone", async () => {
    (resolveDocumentIds as jest.Mock).mockRejectedValueOnce(
      new StrapiEntryNotFoundError("gone"),
    );

    const result = await createPlaylist({
      name: "P",
      isPublic: true,
      description: "d",
      droplets: [{ id: 1 }],
      author: { id: 123 },
      userId: 123,
    });

    expect(result).toEqual({
      ok: false,
      error: "Failed to create playlist",
      data: null,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("updatePlaylist puts to the playlist documentId with droplet documentIds", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse);

    await updatePlaylist(7, {
      name: "P",
      description: "d",
      isPublic: true,
      droplets: [{ id: 1 }],
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/playlists\/doc7$/);
    expect(JSON.parse(init.body).data.droplets).toEqual({ set: ["doc1"] });
  });

  it("updatePlaylist returns the not-found result when the playlist is gone", async () => {
    (strapiEntryUrl as jest.Mock).mockRejectedValueOnce(
      new StrapiEntryNotFoundError("gone"),
    );

    const result = await updatePlaylist(7, {
      name: "P",
      description: "d",
      isPublic: true,
    });

    expect(result).toEqual({ ok: false, error: "Not Found", data: null });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("archivePlaylist uses the playlist entity's documentId for the PUT", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "a@b.c" });
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({ id: 5 });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 10, attributes: { authors: { data: [{ id: 5 }] } } },
          }),
      })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve("") });

    const result = await archivePlaylist(
      { id: 10, documentId: "plDoc" } as any,
      true,
    );

    expect(result).toEqual({ success: true });
    const putUrl = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(putUrl).toMatch(/\/api\/playlists\/plDoc$/);
  });
});
