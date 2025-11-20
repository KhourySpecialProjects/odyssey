const { flattenAttributes } = require("../../lib/utils");
const {
  fetchFriends,
  getSentRequestIds,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unblockUser,
  BlockUser,
  sendFriendRequest,
  removeFriend,
  fetchFriendshipsById,
} = require("../../lib/requests/friends");

jest.mock("../../lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => {
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));
    }
    return data;
  }),
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe("Friends tests", () => {
  const { revalidatePath } = require("next/cache");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchFriends", () => {
    it("should fetch and return friends for an authorized user", async () => {
      const mockUser = {
        id: 5,
        firstName: "Test",
        lastName: "User",
        email: "test.user@northeastern.edu",
        blocked: [],
        was_blocked: [],
      };

      const mockFriendships = [
        {
          id: 1,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 6,
                  attributes: {
                    firstName: "Friend",
                    lastName: "One",
                    email: "friend.one@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
        {
          id: 2,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 7,
                  attributes: {
                    firstName: "Friend",
                    lastName: "Two",
                    email: "friend.two@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
      ];

      const mockStrapiResponse = {
        data: mockFriendships,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      flattenAttributes.mockImplementationOnce((data) => {
        return data.map((friendship) => ({
          id: friendship.id,
          authorized_users: friendship.attributes.authorized_users.data.map(
            (user) => ({
              id: user.id,
              ...user.attributes,
              blocked: user.attributes.blocked.data,
              was_blocked: user.attributes.was_blocked.data,
            }),
          ),
        }));
      });

      const result = await fetchFriends(mockUser);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/friendships\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/filters/);
      expect(callUrl).toMatch(/populate/);
      expect(callUrl).toMatch(/pagination/);
      expect(callUrl).toMatch(/sort/);

      expect(result).toEqual(expect.any(Array));
      expect(result.length).toBe(2);
      expect(result).toContainEqual(
        expect.objectContaining({
          id: 6,
          firstName: "Friend",
          lastName: "One",
          email: "friend.one@northeastern.edu",
        }),
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          id: 7,
          firstName: "Friend",
          lastName: "Two",
          email: "friend.two@northeastern.edu",
        }),
      );
    });

    it("should filter out blocked users", async () => {
      const mockUser = {
        id: 5,
        firstName: "Test",
        lastName: "User",
        email: "test.user@northeastern.edu",
        blocked: [{ id: 7 }],
        was_blocked: [],
      };

      const mockFriendships = [
        {
          id: 1,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [{ id: 7 }] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 6,
                  attributes: {
                    firstName: "Friend",
                    lastName: "One",
                    email: "friend.one@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
        {
          id: 2,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [{ id: 7 }] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 7,
                  attributes: {
                    firstName: "Blocked",
                    lastName: "User",
                    email: "blocked.user@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
      ];

      const mockStrapiResponse = {
        data: mockFriendships,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      flattenAttributes.mockImplementationOnce((data) => {
        return data.map((friendship) => ({
          id: friendship.id,
          authorized_users: friendship.attributes.authorized_users.data.map(
            (user) => ({
              id: user.id,
              ...user.attributes,
              blocked: user.attributes.blocked.data,
              was_blocked: user.attributes.was_blocked.data,
            }),
          ),
        }));
      });

      const result = await fetchFriends(mockUser);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(6);
      expect(result[0].firstName).toBe("Friend");
      expect(result[0].lastName).toBe("One");
    });

    it("should handle fetch errors", async () => {
      const mockUser = { id: 5, blocked: [], was_blocked: [] };
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchFriends(mockUser)).rejects.toThrow(
        "Failed to fetch friends data.",
      );
    });
  });

  describe("getSentRequestIds", () => {
    it("should return an array of user IDs who have sent requests", async () => {
      const mockUser = { id: 5, email: "test.user@northeastern.edu" };

      const mockStrapiResponse = {
        data: [
          { id: 6, attributes: {} },
          { id: 7, attributes: {} },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      flattenAttributes.mockImplementationOnce((data) => {
        return data.map((user) => ({
          id: user.id,
          ...user.attributes,
        }));
      });

      const result = await getSentRequestIds(mockUser);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/authorized-users\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/filters/);
      expect(callUrl).toMatch(/pagination/);
      expect(callUrl).toMatch(/fields/);

      expect(result).toEqual([6, 7]);
    });

    it("should handle fetch errors", async () => {
      const mockUser = { id: 5 };
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getSentRequestIds(mockUser)).rejects.toThrow(
        "Failed to fetch friends data.",
      );
    });
  });

  describe("acceptFriendRequest", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully accept a friend request", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 1 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } }),
        });

      const result = await acceptFriendRequest(userId, requesterId);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/friendships"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              authorized_users: [requesterId, userId],
            },
          }),
        }),
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`/api/authorized-users/${userId}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              received_requests: {
                disconnect: [requesterId],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle error in creating friendship", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error creating friendship",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await acceptFriendRequest(userId, requesterId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle error in removing friend request", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 1 } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => "Error removing friend request",
        });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await acceptFriendRequest(userId, requesterId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await acceptFriendRequest(userId, requesterId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("sendFriendRequest", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully send a friend request", async () => {
      const requester = { id: 5, email: "requester@northeastern.edu" };
      const requestee = { id: 6, email: "requestee@northeastern.edu" };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 6 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } }),
        });

      const result = await sendFriendRequest(requester, requestee);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`/api/authorized-users/${requestee.id}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              received_requests: {
                connect: [requester.id],
              },
            },
          }),
        }),
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`/api/authorized-users/${requester.id}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              sent_requests: {
                connect: [requestee.id],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle error in updating requestee", async () => {
      const requester = { id: 5, email: "requester@northeastern.edu" };
      const requestee = { id: 6, email: "requestee@northeastern.edu" };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error updating requestee",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await sendFriendRequest(requester, requestee);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle error in updating requester", async () => {
      const requester = { id: 5, email: "requester@northeastern.edu" };
      const requestee = { id: 6, email: "requestee@northeastern.edu" };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 6 } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => "Error updating requester",
        });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await sendFriendRequest(requester, requestee);

      expect(result).toEqual({ success: false, error: expect.any(Error) });

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const requester = { id: 5, email: "requester@northeastern.edu" };
      const requestee = { id: 6, email: "requestee@northeastern.edu" };

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await sendFriendRequest(requester, requestee);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("rejectFriendRequest", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully reject a friend request", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await rejectFriendRequest(userId, requesterId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/authorized-users/${userId}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              received_requests: {
                disconnect: [requesterId],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error rejecting friend request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await rejectFriendRequest(userId, requesterId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const requesterId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await rejectFriendRequest(userId, requesterId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("cancelFriendRequest", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully cancel a friend request", async () => {
      const userId = 5;
      const requesteeId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await cancelFriendRequest(userId, requesteeId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/authorized-users/${userId}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              sent_requests: {
                disconnect: [requesteeId],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors", async () => {
      const userId = 5;
      const requesteeId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error canceling friend request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await cancelFriendRequest(userId, requesteeId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const requesteeId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await cancelFriendRequest(userId, requesteeId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("unblockUser", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully unblock a user", async () => {
      const userId = 5;
      const blockedUserId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await unblockUser(userId, blockedUserId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/authorized-users/${userId}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              blocked: {
                disconnect: [blockedUserId],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors", async () => {
      const userId = 5;
      const blockedUserId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error unblocking user",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await unblockUser(userId, blockedUserId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const blockedUserId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await unblockUser(userId, blockedUserId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("BlockUser", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully block a user", async () => {
      const userId = 5;
      const userToBlockId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 5 } }),
      });

      const result = await BlockUser(userId, userToBlockId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/authorized-users/${userId}`),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              blocked: {
                connect: [userToBlockId],
              },
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors", async () => {
      const userId = 5;
      const userToBlockId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Error blocking user",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await BlockUser(userId, userToBlockId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const userToBlockId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await BlockUser(userId, userToBlockId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("removeFriend", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
    });

    it("should successfully remove a friend", async () => {
      const userId = 5;
      const friendId = 6;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 123, attributes: {} }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: null }),
        });

      const result = await removeFriend(userId, friendId);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/\/api\/friendships\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );

      const searchUrl = global.fetch.mock.calls[0][0];
      expect(searchUrl).toMatch(new RegExp(`authorized_users.*id.*${userId}`));
      expect(searchUrl).toMatch(
        new RegExp(`authorized_users.*id.*${friendId}`),
      );

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/friendships/123"),
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");

      expect(result).toEqual({ success: true });
    });

    it("should handle error when friendship not found", async () => {
      const userId = 5;
      const friendId = 6;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await removeFriend(userId, friendId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error:",
        expect.objectContaining({
          message: "Friendship not found",
        }),
      );
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle API errors during friendship deletion", async () => {
      const userId = 5;
      const friendId = 6;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 123, attributes: {} }],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: async () => "Error deleting friendship",
        });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await removeFriend(userId, friendId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const userId = 5;
      const friendId = 6;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await removeFriend(userId, friendId);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("fetchFriendshipsById", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    it("should fetch and return friendships for a user ID", async () => {
      const userId = 5;

      const mockFriendships = [
        {
          id: 1,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 6,
                  attributes: {
                    firstName: "Friend",
                    lastName: "One",
                    email: "friend.one@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
        {
          id: 2,
          attributes: {
            authorized_users: {
              data: [
                {
                  id: 5,
                  attributes: {
                    firstName: "Test",
                    lastName: "User",
                    email: "test.user@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
                {
                  id: 7,
                  attributes: {
                    firstName: "Friend",
                    lastName: "Two",
                    email: "friend.two@northeastern.edu",
                    blocked: { data: [] },
                    was_blocked: { data: [] },
                  },
                },
              ],
            },
          },
        },
      ];

      const mockStrapiResponse = {
        data: mockFriendships,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrapiResponse,
      });

      flattenAttributes.mockImplementationOnce((data) => {
        return data.map((friendship) => ({
          id: friendship.id,
          authorized_users: friendship.attributes.authorized_users.data.map(
            (user) => ({
              id: user.id,
              ...user.attributes,
              blocked: user.attributes.blocked.data,
              was_blocked: user.attributes.was_blocked.data,
            }),
          ),
        }));
      });

      const result = await fetchFriendshipsById(userId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/friendships\?/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
          cache: "no-store",
        }),
      );

      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toMatch(/filters/);
      expect(callUrl).toMatch(/pagination/);
      expect(callUrl).toMatch(/populate/);
      expect(callUrl).toMatch(new RegExp(`authorized_users.*id.*${userId}`));

      expect(result).toEqual(expect.any(Array));
      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        id: 1,
        authorized_users: expect.arrayContaining([
          expect.objectContaining({ id: 5 }),
          expect.objectContaining({ id: 6 }),
        ]),
      });

      expect(result[1]).toMatchObject({
        id: 2,
        authorized_users: expect.arrayContaining([
          expect.objectContaining({ id: 5 }),
          expect.objectContaining({ id: 7 }),
        ]),
      });
    });

    it("should handle fetch errors", async () => {
      const userId = 5;
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchFriendshipsById(userId)).rejects.toThrow(
        "Failed to fetch friendships",
      );
    });

    it("should throw error for null user ID", async () => {
      await expect(fetchFriendshipsById(null)).rejects.toThrow(
        "Failed to fetch friendships",
      );
    });
  });

  describe("Friends Functions", () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      bio: "",
      github: "",
      linkedin: "",
      profilePhoto: null,
      blocked: [],
      was_blocked: [],
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    describe("fetchFriends", () => {
      it("fetches friends successfully", async () => {
        const mockResponse = {
          data: [
            {
              attributes: {
                authorized_users: [mockUser],
              },
            },
          ],
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await fetchFriends(mockUser);
        expect(result).toBeInstanceOf(Array);
      });

      it("handles fetch error", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Fetch failed"));

        await expect(fetchFriends(mockUser)).rejects.toThrow(
          "Failed to fetch friends data",
        );
      });
    });

    describe("acceptFriendRequest", () => {
      it("accepts friend request successfully", async () => {
        global.fetch
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({ ok: true });

        const result = await acceptFriendRequest(1, 2);
        expect(result.success).toBe(true);
      });

      it("handles acceptance failure", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Failed"));

        const result = await acceptFriendRequest(1, 2);
        expect(result.success).toBe(false);
      });
    });
  });
});
