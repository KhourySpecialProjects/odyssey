import {
  getVoyageEnrollment,
  getVoyageEnrollmentsByUser,
  enrollInVoyage,
  unenrollFromVoyage,
  getVoyageNodeCompletions,
  markVoyageNodeComplete,
  checkAndCompleteVoyageNode,
} from "@/lib/requests/voyage-enrollment";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

const mockUser = { email: "student@example.com" };
const mockAuthorizedUser = { id: 42, email: "student@example.com" };

describe("getVoyageEnrollment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the enrollment when one exists", async () => {
    const mockEnrollment = {
      id: 1,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 0,
    };
    (fetchAPI as jest.Mock).mockResolvedValue([mockEnrollment]);

    const result = await getVoyageEnrollment(42, 10);

    expect(fetchAPI).toHaveBeenCalledWith("/voyage-enrollments", {
      urlParams: expect.objectContaining({
        filters: {
          $and: [
            { authorizedUser: { id: { $eq: 42 } } },
            { voyage: { id: { $eq: 10 } } },
          ],
        },
      }),
      next: expect.objectContaining({
        tags: [
          CACHE_TAGS.voyageEnrollments(42),
          CACHE_TAGS.allVoyageEnrollments,
        ],
        revalidate: 900,
      }),
    });
    expect(result).toEqual(mockEnrollment);
  });

  it("returns null when no enrollment exists", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const result = await getVoyageEnrollment(42, 10);

    expect(result).toBeNull();
  });
});

describe("getVoyageEnrollmentsByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches enrollments for the user with voyage populated", async () => {
    const mockEnrollments = [
      {
        id: 1,
        enrolledAt: "2026-01-01T00:00:00.000Z",
        completionPercentage: 50,
        voyage: { id: 10, name: "My Voyage", slug: "my-voyage" },
      },
    ];
    (fetchAPI as jest.Mock).mockResolvedValue(mockEnrollments);

    const result = await getVoyageEnrollmentsByUser(42);

    expect(fetchAPI).toHaveBeenCalledWith("/voyage-enrollments", {
      urlParams: expect.objectContaining({
        filters: { authorizedUser: { id: { $eq: 42 } } },
        populate: expect.objectContaining({
          voyage: expect.objectContaining({
            fields: expect.arrayContaining(["id", "name", "slug"]),
          }),
        }),
      }),
      next: expect.objectContaining({
        tags: [
          CACHE_TAGS.voyageEnrollments(42),
          CACHE_TAGS.allVoyageEnrollments,
        ],
        revalidate: 900,
      }),
    });
    expect(result).toEqual(mockEnrollments);
  });

  it("returns empty array when user has no enrollments", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const result = await getVoyageEnrollmentsByUser(99);

    expect(result).toEqual([]);
  });
});

describe("enrollInVoyage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new enrollment when none exists", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    // getVoyageEnrollment returns null (not enrolled)
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const createdEnrollment = {
      id: 5,
      enrolledAt: "2026-04-08T00:00:00.000Z",
      completionPercentage: 0,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: createdEnrollment }),
    });
    (flattenAttributes as jest.Mock).mockReturnValue(createdEnrollment);

    const result = await enrollInVoyage(10);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyage-enrollments"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining('"voyage":10'),
      }),
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(42),
    );
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.allVoyageEnrollments);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(result).toEqual({
      ok: true,
      error: null,
      data: createdEnrollment,
    });
  });

  it("returns existing enrollment when already enrolled (idempotent)", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    const existingEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 25,
    };
    // getVoyageEnrollment returns existing
    (fetchAPI as jest.Mock).mockResolvedValue([existingEnrollment]);

    const result = await enrollInVoyage(10);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      error: null,
      data: existingEnrollment,
    });
  });

  it("returns error when user is not authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await enrollInVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "User not authenticated",
      data: null,
    });
  });

  it("returns error when fetch fails", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    (fetchAPI as jest.Mock).mockResolvedValue([]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Server error" } }),
    });

    const result = await enrollInVoyage(10);

    expect(revalidateTag).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: "Server error",
      data: null,
    });
  });
});

describe("unenrollFromVoyage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes enrollment and revalidates tags", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    const existingEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 0,
    };
    // 1. getVoyageEnrollment
    (fetchAPI as jest.Mock).mockResolvedValueOnce([existingEnrollment]);
    // 2. completions query (no orphaned completions)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    // DELETE enrollment
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: existingEnrollment }),
    });
    (flattenAttributes as jest.Mock).mockReturnValue(existingEnrollment);

    const result = await unenrollFromVoyage(10);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyage-enrollments/5"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(42),
    );
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.allVoyageEnrollments);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(result).toEqual({
      ok: true,
      error: null,
      data: existingEnrollment,
    });
  });

  it("returns ok:true (no-op) when not enrolled", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const result = await unenrollFromVoyage(10);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, error: null, data: null });
  });

  it("returns error when user is not authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await unenrollFromVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "User not authenticated",
      data: null,
    });
  });

  it("returns error when delete fetch fails", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    const existingEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 0,
    };
    // 1. getVoyageEnrollment
    (fetchAPI as jest.Mock).mockResolvedValueOnce([existingEnrollment]);
    // 2. completions query (none)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    // DELETE fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const result = await unenrollFromVoyage(10);

    expect(revalidateTag).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: "Failed to unenroll from voyage.",
      data: null,
    });
  });
});

describe("getVoyageNodeCompletions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches node completions filtered by user and voyage", async () => {
    const mockCompletions = [
      {
        id: 1,
        completedAt: "2026-04-01T10:00:00.000Z",
        voyageNode: { id: 7 },
      },
    ];
    (fetchAPI as jest.Mock).mockResolvedValue(mockCompletions);

    const result = await getVoyageNodeCompletions(42, 10);

    expect(fetchAPI).toHaveBeenCalledWith("/voyage-node-completions", {
      urlParams: expect.objectContaining({
        filters: {
          $and: [
            { authorizedUser: { id: { $eq: 42 } } },
            { voyageEnrollment: { voyage: { id: { $eq: 10 } } } },
          ],
        },
        populate: expect.objectContaining({
          voyageNode: expect.objectContaining({
            fields: expect.arrayContaining(["id"]),
          }),
        }),
      }),
      next: expect.objectContaining({
        tags: [CACHE_TAGS.voyageEnrollments(42)],
        revalidate: 900,
      }),
    });
    expect(result).toEqual(mockCompletions);
  });

  it("returns empty array when no completions exist", async () => {
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const result = await getVoyageNodeCompletions(42, 10);

    expect(result).toEqual([]);
  });
});

describe("markVoyageNodeComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a node completion record and updates enrollment percentage", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);

    const createdCompletion = {
      id: 99,
      completedAt: "2026-04-08T00:00:00.000Z",
      voyageNode: { id: 7 },
    };

    // Mock fetchAPI calls in order:
    // 1. enrollmentCheck (verify ownership)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 5 }]);
    // 2. existing completion check (idempotent — none found)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    // Mock: POST voyage-node-completion
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: createdCompletion }),
    });

    // 3. GET enrollment to find voyage id
    const mockEnrollmentWithVoyage = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 0,
      voyage: { id: 10 },
    };
    (fetchAPI as jest.Mock).mockResolvedValueOnce([mockEnrollmentWithVoyage]);

    // 4. GET voyage nodes (for completion calc)
    const mockNodes = [
      { id: 7, branchType: "required", isMainPath: true },
      { id: 8, branchType: "required", isMainPath: true },
      { id: 9, branchType: "optional", isMainPath: false },
    ];
    (fetchAPI as jest.Mock).mockResolvedValueOnce(mockNodes);

    // 5. GET existing completions (for counting)
    const mockExistingCompletions = [{ id: 99, voyageNode: { id: 7 } }];
    (fetchAPI as jest.Mock).mockResolvedValueOnce(mockExistingCompletions);

    // Mock: PUT voyage-enrollment (update percentage)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { ...mockEnrollmentWithVoyage, completionPercentage: 50 },
        }),
    });
    (flattenAttributes as jest.Mock).mockReturnValue(createdCompletion);

    const result = await markVoyageNodeComplete(7, 5);

    // Should POST to create completion
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyage-node-completions"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining('"voyageNode":7'),
      }),
    );

    // Should revalidate tags
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(42),
    );
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.allVoyageEnrollments);

    expect(result).toEqual(expect.objectContaining({ ok: true }));
  });

  it("returns error when user is not authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual(expect.objectContaining({ ok: false, data: null }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns error when POST fails", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);

    // 1. enrollmentCheck (verify ownership)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 5 }]);
    // 2. existing completion check (none found)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Database error" } }),
    });

    const result = await markVoyageNodeComplete(7, 5);

    expect(revalidateTag).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });
});

describe("checkAndCompleteVoyageNode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks node complete when all playlist droplets are complete", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(mockAuthorizedUser);

    // 1. GET playlists containing droplet 20
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 7 }]);

    // 2. GET voyage-nodes for playlist 7
    const mockVoyageNodes = [
      { id: 7, voyage: { id: 10 }, playlist: { id: 7 } },
    ];
    (fetchAPI as jest.Mock).mockResolvedValueOnce(mockVoyageNodes);

    // 3. GET playlist with droplets (to check all are complete)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, droplets: [{ id: 20 }, { id: 21 }] },
    ]);

    // 4. GET completed enrollments for those droplets (all complete)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 100 }, { id: 101 }]);

    // 5. GET voyage enrollment (user is enrolled)
    const mockEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 0,
      voyage: { id: 10 },
    };
    (fetchAPI as jest.Mock).mockResolvedValueOnce([mockEnrollment]);

    // 6. GET existing completions for node (empty = not yet completed)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    // Inside markVoyageNodeComplete:
    // 7. enrollmentCheck
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 5 }]);
    // 8. existing completion check
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    // POST create completion
    const createdCompletion = {
      id: 99,
      completedAt: "2026-04-08T00:00:00.000Z",
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: createdCompletion }),
    });

    // 9. GET enrollment for voyage id
    (fetchAPI as jest.Mock).mockResolvedValueOnce([mockEnrollment]);

    // 10. GET voyage nodes for percentage calc
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, branchType: "required" },
      { id: 8, branchType: "required" },
    ]);

    // 11. GET existing completions for percentage
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ voyageNode: { id: 7 } }]);

    // PUT enrollment
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { ...mockEnrollment, completionPercentage: 50 },
        }),
    });
    (flattenAttributes as jest.Mock).mockReturnValue(createdCompletion);

    await expect(checkAndCompleteVoyageNode(20, 42)).resolves.not.toThrow();

    // Verify playlists were queried for this droplet
    expect(fetchAPI).toHaveBeenCalledWith(
      "/playlists",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { droplets: { id: { $eq: 20 } } },
        }),
      }),
    );
  });

  it("does not mark node when not all playlist droplets are complete", async () => {
    // 1. GET playlists containing droplet
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 7 }]);

    // 2. GET voyage-nodes for playlist 7
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, voyage: { id: 10 }, playlist: { id: 7 } },
    ]);

    // 3. GET playlist with droplets (2 droplets)
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, droplets: [{ id: 20 }, { id: 21 }] },
    ]);

    // 4. GET completed enrollments — only 1 of 2 complete
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 100 }]);

    await checkAndCompleteVoyageNode(20, 42);

    // Should NOT create a completion
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does nothing when user is not enrolled in the voyage", async () => {
    // 1. GET playlists containing droplet
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 7 }]);

    // 2. GET voyage-nodes for playlist 7
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, voyage: { id: 10 }, playlist: { id: 7 } },
    ]);

    // 3. GET playlist with droplets
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, droplets: [{ id: 20 }] },
    ]);

    // 4. All droplets complete
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 100 }]);

    // 5. No enrollment
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    await checkAndCompleteVoyageNode(20, 42);

    // Should NOT create a completion
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does nothing when node is already completed", async () => {
    // 1. GET playlists containing droplet
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 7 }]);

    // 2. GET voyage-nodes for playlist 7
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, voyage: { id: 10 }, playlist: { id: 7 } },
    ]);

    // 3. GET playlist with droplets
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 7, droplets: [{ id: 20 }] },
    ]);

    // 4. All droplets complete
    (fetchAPI as jest.Mock).mockResolvedValueOnce([{ id: 100 }]);

    const mockEnrollment = {
      id: 5,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 50,
      voyage: { id: 10 },
    };
    (fetchAPI as jest.Mock).mockResolvedValueOnce([mockEnrollment]);

    // Node already completed
    (fetchAPI as jest.Mock).mockResolvedValueOnce([
      { id: 99, voyageNode: { id: 7 } },
    ]);

    await checkAndCompleteVoyageNode(20, 42);

    // Should NOT create another completion
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does nothing when droplet belongs to no playlists", async () => {
    // No playlists contain this droplet
    (fetchAPI as jest.Mock).mockResolvedValueOnce([]);

    await checkAndCompleteVoyageNode(999, 42);

    // No further fetches needed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not throw when an error occurs (try-catch wrapping)", async () => {
    (fetchAPI as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    await expect(checkAndCompleteVoyageNode(20, 42)).resolves.not.toThrow();
  });
});
