const { flattenAttributes } = require("../../lib/utils");
const { fetchAPI } = require("../../lib/utils");
const {
  fetchFriends,
  getSentRequest,
  getSentRequestIds,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unblockUser,
  BlockUser,
  sendFriendRequest,
  removeFriend,
  fetchFriendshipsById,
  fetchSuggestionsById
} = require("../../lib/requests/friends");

const data = require("../mocks/strapiMock");
const mockUsers = require("../mocks/authorizedUsersMock");
const mockGroups = require("../mocks/groupsMock");
const mockNotes = require("../mocks/notesMock");

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

//Comment this out if working on error testing (suppresses console error logs from error mocking)

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console errors
  jest.spyOn(console, "warn").mockImplementation(() => {}); // Suppress console warnings
});

afterEach(() => {
  jest.restoreAllMocks(); // Restore console after each test
});

// Mock Next.js cache functions
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
          was_blocked: []
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
                      was_blocked: { data: [] }
                    }
                  },
                  {
                    id: 6,
                    attributes: {
                      firstName: "Friend",
                      lastName: "One",
                      email: "friend.one@northeastern.edu",
                      blocked: { data: [] },
                      was_blocked: { data: [] }
                    }
                  }
                ]
              }
            }
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
                      was_blocked: { data: [] }
                    }
                  },
                  {
                    id: 7,
                    attributes: {
                      firstName: "Friend",
                      lastName: "Two",
                      email: "friend.two@northeastern.edu",
                      blocked: { data: [] },
                      was_blocked: { data: [] }
                    }
                  }
                ]
              }
            }
          }
        ];
  
        const mockStrapiResponse = {
          data: mockFriendships
        };
  
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStrapiResponse
        });
  
        // Define mock implementation for flattenAttributes
        flattenAttributes.mockImplementationOnce((data) => {
          return data.map(friendship => ({
            id: friendship.id,
            authorized_users: friendship.attributes.authorized_users.data.map(user => ({
              id: user.id,
              ...user.attributes,
              blocked: user.attributes.blocked.data,
              was_blocked: user.attributes.was_blocked.data
            }))
          }));
        });
  
        const result = await fetchFriends(mockUser);
  
        // Verify the request URL contains expected query parameters
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/friendships\?/),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer")
            }),
            cache: "no-store"
          })
        );
  
        // Check that the URL includes specific filters and sort parameters
        const callUrl = global.fetch.mock.calls[0][0];
        expect(callUrl).toMatch(/filters/);
        expect(callUrl).toMatch(/populate/);
        expect(callUrl).toMatch(/pagination/);
        expect(callUrl).toMatch(/sort/);
  
        // Verify the result is processed correctly
        expect(result).toEqual(expect.any(Array));
        expect(result.length).toBe(2);
        expect(result).toContainEqual(expect.objectContaining({
          id: 6,
          firstName: "Friend",
          lastName: "One",
          email: "friend.one@northeastern.edu"
        }));
        expect(result).toContainEqual(expect.objectContaining({
          id: 7,
          firstName: "Friend",
          lastName: "Two",
          email: "friend.two@northeastern.edu"
        }));
      });
  
      it("should filter out blocked users", async () => {
        const mockUser = {
          id: 5,
          firstName: "Test",
          lastName: "User",
          email: "test.user@northeastern.edu",
          blocked: [{ id: 7 }],
          was_blocked: []
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
                      was_blocked: { data: [] }
                    }
                  },
                  {
                    id: 6,
                    attributes: {
                      firstName: "Friend",
                      lastName: "One",
                      email: "friend.one@northeastern.edu",
                      blocked: { data: [] },
                      was_blocked: { data: [] }
                    }
                  }
                ]
              }
            }
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
                      was_blocked: { data: [] }
                    }
                  },
                  {
                    id: 7,
                    attributes: {
                      firstName: "Blocked",
                      lastName: "User",
                      email: "blocked.user@northeastern.edu",
                      blocked: { data: [] },
                      was_blocked: { data: [] }
                    }
                  }
                ]
              }
            }
          }
        ];
  
        const mockStrapiResponse = {
          data: mockFriendships
        };
  
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStrapiResponse
        });
  
        flattenAttributes.mockImplementationOnce((data) => {
          return data.map(friendship => ({
            id: friendship.id,
            authorized_users: friendship.attributes.authorized_users.data.map(user => ({
              id: user.id,
              ...user.attributes,
              blocked: user.attributes.blocked.data,
              was_blocked: user.attributes.was_blocked.data
            }))
          }));
        });
  
        const result = await fetchFriends(mockUser);
  
        // Verify only the non-blocked friend is returned
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(6);
        expect(result[0].firstName).toBe("Friend");
        expect(result[0].lastName).toBe("One");
      });
  
      it("should handle fetch errors", async () => {
        const mockUser = { id: 5, blocked: [], was_blocked: [] };
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        await expect(fetchFriends(mockUser)).rejects.toThrow(
          "Failed to fetch friends data."
        );
      });
    });
  
    describe("getSentRequest", () => {
      it("should return true if a friend request has been sent", async () => {
        const requester = { id: 5, email: "test.user@northeastern.edu" };
        const requestee = { id: 6, email: "friend.one@northeastern.edu" };
  
        const mockStrapiResponse = {
          data: [{ id: 5 }] // Non-empty array indicates request exists
        };
  
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStrapiResponse
        });
  
        flattenAttributes.mockImplementationOnce((data) => data);
  
        const result = await getSentRequest(requester, requestee);
  
        // Verify the request URL contains expected parameters
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/authorized-users\?/),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer")
            }),
            cache: "no-store"
          })
        );
  
        // Verify the result
        expect(result).toBe(true);
      });
  
      it("should return false if no friend request has been sent", async () => {
        const requester = { id: 5, email: "test.user@northeastern.edu" };
        const requestee = { id: 6, email: "friend.one@northeastern.edu" };
  
        const mockStrapiResponse = {
          data: [] // Empty array indicates no request exists
        };
  
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStrapiResponse
        });
  
        flattenAttributes.mockImplementationOnce((data) => data);
  
        const result = await getSentRequest(requester, requestee);
  
        expect(result).toBe(false);
      });
  
      it("should handle fetch errors", async () => {
        const requester = { id: 5 };
        const requestee = { id: 6 };
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        await expect(getSentRequest(requester, requestee)).rejects.toThrow(
          "Failed to fetch friends data."
        );
      });
    });
  
    describe("getSentRequestIds", () => {
      it("should return an array of user IDs who have sent requests", async () => {
        const mockUser = { id: 5, email: "test.user@northeastern.edu" };
        
        const mockStrapiResponse = {
          data: [
            { id: 6, attributes: {} },
            { id: 7, attributes: {} }
          ]
        };
  
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStrapiResponse
        });
  
        flattenAttributes.mockImplementationOnce((data) => {
          return data.map(user => ({
            id: user.id,
            ...user.attributes
          }));
        });
  
        const result = await getSentRequestIds(mockUser);
  
        // Verify the request URL contains expected parameters
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/authorized-users\?/),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer")
            }),
            cache: "no-store"
          })
        );
  
        // Verify the URL includes specific filters and pagination
        const callUrl = global.fetch.mock.calls[0][0];
        expect(callUrl).toMatch(/filters/);
        expect(callUrl).toMatch(/pagination/);
        expect(callUrl).toMatch(/fields/);
  
        // Verify the result is processed correctly
        expect(result).toEqual([6, 7]);
      });
  
      it("should handle fetch errors", async () => {
        const mockUser = { id: 5 };
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        await expect(getSentRequestIds(mockUser)).rejects.toThrow(
          "Failed to fetch friends data."
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
  
        // Mock successful responses for both API calls
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 1 } })
        }).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await acceptFriendRequest(userId, requesterId);
  
        // Check first fetch call - creating the friendship
        expect(global.fetch).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining("/api/friendships"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                authorized_users: [requesterId, userId]
              }
            })
          })
        );
  
        // Check second fetch call - removing the friend request
        expect(global.fetch).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining(`/api/authorized-users/${userId}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                received_requests: {
                  disconnect: [requesterId]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle error in creating friendship", async () => {
        const userId = 5;
        const requesterId = 6;
  
        // Mock a failed response for the first API call
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error creating friendship"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await acceptFriendRequest(userId, requesterId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle error in removing friend request", async () => {
        const userId = 5;
        const requesterId = 6;
  
        // Mock successful first call but failed second call
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 1 } })
        }).mockResolvedValueOnce({
          ok: false,
          text: async () => "Error removing friend request"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await acceptFriendRequest(userId, requesterId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const userId = 5;
        const requesterId = 6;
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
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
  
        // Mock successful responses for both API calls
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 6 } })
        }).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await sendFriendRequest(requester, requestee);
  
        // Check first fetch call - updating requestee's received_requests
        expect(global.fetch).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining(`/api/authorized-users/${requestee.id}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                received_requests: {
                  connect: [requester.id]
                }
              }
            })
          })
        );
  
        // Check second fetch call - updating requester's sent_requests
        expect(global.fetch).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining(`/api/authorized-users/${requester.id}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                sent_requests: {
                  connect: [requestee.id]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle error in updating requestee", async () => {
        const requester = { id: 5, email: "requester@northeastern.edu" };
        const requestee = { id: 6, email: "requestee@northeastern.edu" };
  
        // Mock a failed response for the first API call
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error updating requestee"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await sendFriendRequest(requester, requestee);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle error in updating requester", async () => {
        const requester = { id: 5, email: "requester@northeastern.edu" };
        const requestee = { id: 6, email: "requestee@northeastern.edu" };
  
        // Mock successful first call but failed second call
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 6 } })
        }).mockResolvedValueOnce({
          ok: false,
          text: async () => "Error updating requester"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await sendFriendRequest(requester, requestee);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const requester = { id: 5, email: "requester@northeastern.edu" };
        const requestee = { id: 6, email: "requestee@northeastern.edu" };
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
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
  
        // Mock successful response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await rejectFriendRequest(userId, requesterId);
  
        // Check fetch call - removing the friend request
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/authorized-users/${userId}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                received_requests: {
                  disconnect: [requesterId]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle API errors", async () => {
        const userId = 5;
        const requesterId = 6;
  
        // Mock a failed response
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error rejecting friend request"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await rejectFriendRequest(userId, requesterId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const userId = 5;
        const requesterId = 6;
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
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
  
        // Mock successful response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await cancelFriendRequest(userId, requesteeId);
  
        // Check fetch call - removing the sent request
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/authorized-users/${userId}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                sent_requests: {
                  disconnect: [requesteeId]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle API errors", async () => {
        const userId = 5;
        const requesteeId = 6;
  
        // Mock a failed response
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error canceling friend request"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await cancelFriendRequest(userId, requesteeId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const userId = 5;
        const requesteeId = 6;
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
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
  
        // Mock successful response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await unblockUser(userId, blockedUserId);
  
        // Check fetch call - updating blocked list
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/authorized-users/${userId}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                blocked: {
                  disconnect: [blockedUserId]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle API errors", async () => {
        const userId = 5;
        const blockedUserId = 6;
  
        // Mock a failed response
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error unblocking user"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await unblockUser(userId, blockedUserId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const userId = 5;
        const blockedUserId = 6;
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
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
  
        // Mock successful response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 5 } })
        });
  
        const result = await BlockUser(userId, userToBlockId);
  
        // Check fetch call - updating blocked list
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/authorized-users/${userId}`),
          expect.objectContaining({
            method: "PUT",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: expect.stringContaining("Bearer")
            }),
            body: JSON.stringify({
              data: {
                blocked: {
                  connect: [userToBlockId]
                }
              }
            })
          })
        );
  
        // Check if revalidation function was called
        expect(revalidatePath).toHaveBeenCalledWith("/settings/friends");
  
        // Check returned result
        expect(result).toEqual({ success: true });
      });
  
      it("should handle API errors", async () => {
        const userId = 5;
        const userToBlockId = 6;
  
        // Mock a failed response
        global.fetch.mockResolvedValueOnce({
          ok: false,
          text: async () => "Error blocking user"
        });
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await BlockUser(userId, userToBlockId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
  
      it("should handle network errors", async () => {
        const userId = 5;
        const userToBlockId = 6;
  
        global.fetch.mockRejectedValueOnce(new Error("Network error"));
  
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        
        const result = await BlockUser(userId, userToBlockId);
        
        expect(result).toEqual({ success: false, error: expect.any(Error) });
        expect(revalidatePath).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });
});