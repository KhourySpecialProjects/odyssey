import { createVoyageWithNodes } from "@/lib/requests/voyage";
import { flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireRole } from "@/lib/auth/require-role";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

function mockAuthorized() {
  (requireRole as jest.Mock).mockResolvedValue({
    ok: true,
    user: { id: 1, email: "admin@example.com", roles: ["System Admin"] },
  });
}

function mockUnauthorized() {
  (requireRole as jest.Mock).mockResolvedValue({
    ok: false,
    error: "unauthenticated",
  });
}

describe("createVoyageWithNodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns Unauthorized when user is not admin or faculty", async () => {
    mockUnauthorized();

    const result = await createVoyageWithNodes({
      name: "Test Voyage",
      nodes: [],
    });

    expect(result).toEqual({ ok: false, error: "Unauthorized", data: null });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a voyage with main path nodes and branch nodes", async () => {
    mockAuthorized();

    const createdVoyage = { id: 99, name: "Test Voyage", slug: "test-voyage" };
    const mainNode1 = { id: 10, label: "Intro", isMainPath: true };
    const mainNode2 = { id: 11, label: "Core", isMainPath: true };
    const branchNode1 = { id: 20, label: "Extra", isMainPath: false };

    (flattenAttributes as jest.Mock)
      .mockReturnValueOnce(createdVoyage) // voyage POST
      .mockReturnValueOnce(mainNode1) // main node 1
      .mockReturnValueOnce(mainNode2) // main node 2
      .mockReturnValueOnce(branchNode1); // branch node

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdVoyage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mainNode1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mainNode2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: branchNode1 }),
      });

    const result = await createVoyageWithNodes({
      name: "Test Voyage",
      description: "A test",
      status: "draft",
      authorId: 1,
      nodes: [
        {
          playlistId: 5,
          label: "Intro",
          isMainPath: true,
          branchType: "required",
          parentPlaylistId: null,
          orderIndex: 0,
        },
        {
          playlistId: 6,
          label: "Core",
          isMainPath: true,
          branchType: "required",
          parentPlaylistId: null,
          orderIndex: 1,
        },
        {
          playlistId: 7,
          label: "Extra",
          isMainPath: false,
          branchType: "optional",
          parentPlaylistId: 5, // branch off playlist 5 → Strapi node id 10
          orderIndex: 0,
        },
      ],
    });

    // Voyage was created first
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/voyages"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Test Voyage"'),
      }),
    );

    // Main node 1 created with voyage ID
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/voyage-nodes"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"voyage":99'),
      }),
    );

    // Branch node created with parentNode set to Strapi ID of playlist 5's node (id 10)
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("/api/voyage-nodes"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"parentNode":10'),
      }),
    );

    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userContent);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: createdVoyage,
    });
  });

  it("returns error if voyage POST fails", async () => {
    mockAuthorized();

    const createdVoyage = { id: 99, name: "Bad Voyage", slug: "bad-voyage" };
    (flattenAttributes as jest.Mock).mockReturnValueOnce(createdVoyage);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Validation failed" } }),
    });

    const result = await createVoyageWithNodes({
      name: "Bad Voyage",
      nodes: [
        {
          playlistId: 5,
          label: "Intro",
          isMainPath: true,
          branchType: "required",
          parentPlaylistId: null,
          orderIndex: 0,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "Validation failed",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("cleans up voyage if node creation fails", async () => {
    mockAuthorized();

    const createdVoyage = { id: 99, name: "Test Voyage", slug: "test-voyage" };

    (flattenAttributes as jest.Mock).mockReturnValueOnce(createdVoyage);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdVoyage }),
      })
      // Node creation fails
      .mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({ error: { message: "Node creation failed" } }),
      })
      // Cleanup DELETE succeeds
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const result = await createVoyageWithNodes({
      name: "Test Voyage",
      nodes: [
        {
          playlistId: 5,
          label: "Intro",
          isMainPath: true,
          branchType: "required",
          parentPlaylistId: null,
          orderIndex: 0,
        },
      ],
    });

    // Cleanup DELETE was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyages/99"),
      expect.objectContaining({ method: "DELETE" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "Node creation failed",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
