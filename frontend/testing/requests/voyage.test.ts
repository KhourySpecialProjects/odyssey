import { createVoyageWithNodes } from "@/lib/requests/voyage";
import { flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getServerSession } from "next-auth";
import { getCachedUser } from "@/lib/requests/cached";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth/options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/validations/voyage", () => ({
  VoyageTreeSchema: {
    safeParse: jest.fn((input: unknown) => ({ success: true, data: input })),
  },
}));

import { requireRole } from "@/lib/auth/require-role";

const mockAdminUser = {
  id: 1,
  email: "admin@example.com",
  roles: [{ title: "System Admin" }],
};

function mockAuthorized() {
  (requireRole as jest.Mock).mockResolvedValue({
    ok: true,
    user: { email: "admin@example.com", roles: ["System Admin"] },
  });
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { email: "admin@example.com" },
  });
  (getCachedUser as jest.Mock).mockResolvedValue(mockAdminUser);
}

describe("createVoyageWithNodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns Unauthorized when user is not admin or faculty", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });
    (getServerSession as jest.Mock).mockResolvedValue(null);

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
          localId: "local-1",
          nodeType: "playlist",
          playlistId: 5,
          dropletId: null,
          label: "Intro",
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: 0,
        },
        {
          localId: "local-2",
          nodeType: "playlist",
          playlistId: 6,
          dropletId: null,
          label: "Core",
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: 1,
        },
        {
          localId: "local-3",
          nodeType: "playlist",
          playlistId: 7,
          dropletId: null,
          label: "Extra",
          isMainPath: false,
          branchType: "optional",
          parentLocalId: "local-1", // branch off local-1 → Strapi node id 10
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

    // Branch node created with parentNode set to Strapi ID of local-1's node (id 10)
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

  it("creates a voyage with a droplet node", async () => {
    mockAuthorized();

    const createdVoyage = {
      id: 100,
      name: "Droplet Voyage",
      slug: "droplet-voyage",
    };
    const dropletNode = { id: 30, label: "My Droplet", isMainPath: true };

    (flattenAttributes as jest.Mock)
      .mockReturnValueOnce(createdVoyage)
      .mockReturnValueOnce(dropletNode);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdVoyage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: dropletNode }),
      });

    const result = await createVoyageWithNodes({
      name: "Droplet Voyage",
      nodes: [
        {
          localId: "droplet-local-1",
          nodeType: "droplet",
          playlistId: null,
          dropletId: 42,
          label: "My Droplet",
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: 0,
        },
      ],
    });

    // Droplet node created with droplet relation
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/voyage-nodes"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"droplet":42'),
      }),
    );

    expect(result).toEqual({ ok: true, error: null, data: createdVoyage });
  });

  it("creates a voyage with a placeholder droplet node (no dropletId)", async () => {
    mockAuthorized();

    const createdVoyage = {
      id: 101,
      name: "Placeholder Voyage",
      slug: "placeholder-voyage",
    };
    const placeholderNode = {
      id: 31,
      label: "Unclaimed",
      isMainPath: true,
    };

    (flattenAttributes as jest.Mock)
      .mockReturnValueOnce(createdVoyage)
      .mockReturnValueOnce(placeholderNode);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdVoyage }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: placeholderNode }),
      });

    const result = await createVoyageWithNodes({
      name: "Placeholder Voyage",
      nodes: [
        {
          localId: "placeholder-local-1",
          nodeType: "droplet",
          playlistId: null,
          dropletId: null,
          label: "Unclaimed",
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: 0,
        },
      ],
    });

    // Placeholder node sent with claimStatus unclaimed
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/voyage-nodes"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"claimStatus":"unclaimed"'),
      }),
    );

    expect(result).toEqual({
      ok: true,
      error: null,
      data: createdVoyage,
    });
  });

  it("returns error if voyage POST fails", async () => {
    mockAuthorized();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Validation failed" } }),
    });

    const result = await createVoyageWithNodes({
      name: "Bad Voyage",
      nodes: [],
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
          localId: "local-1",
          nodeType: "playlist",
          playlistId: 5,
          dropletId: null,
          label: "Intro",
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
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

  it("creates voyage with no nodes successfully", async () => {
    mockAuthorized();

    const createdVoyage = {
      id: 99,
      name: "Empty Voyage",
      slug: "empty-voyage",
    };
    (flattenAttributes as jest.Mock).mockReturnValueOnce(createdVoyage);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: createdVoyage }),
    });

    const result = await createVoyageWithNodes({
      name: "Empty Voyage",
      nodes: [],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(result).toEqual({
      ok: true,
      error: null,
      data: createdVoyage,
    });
  });
});
