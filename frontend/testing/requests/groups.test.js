const {
    getManagedGroups,
    getGroupBySlug,
    getGroupByID,
    getUserGroups,
    updateGroupMembers,
    addGroupMembers,
    removeGroupMembers,
    changeGroupMemberRole,
} = require("../../lib/requests/groups");

const {
    createGroup,
    getGroupBySlugV2,
    updateGroup,
    createAuthorizedUserInGroup,
    enrollUsers,
    assignDropletDueDate,
    assignPlaylistDueDate,
    getGroupDueDate,
    getGroupDueDates,
    getUserDueDates,
} = require("../../lib/requests/groups");

const { flattenAttributes } = require("../../lib/utils");
const { fetchAPI } = require("../../lib/utils");
const {
    getAuthorizedUserByEmail,
} = require("../../lib/requests/authorized-user");
const { createEnrollmentFromEmail } = require("../../lib/actions");
const { enrollInPlaylist } = require("../../lib/requests/playlist-enrollment");
const { revalidatePath } = require("next/cache");

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

// Mock dependencies
jest.mock("../../lib/utils", () => ({
    fetchAPI: jest.fn(),
}));

jest.mock("../../lib/requests/authorized-user", () => ({
    getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("../../lib/actions", () => ({
    createEnrollmentFromEmail: jest.fn(),
}));

jest.mock("../../lib/requests/playlist-enrollment", () => ({
    enrollInPlaylist: jest.fn(),
}));

jest.mock("../../lib/requests/authorized-user-roles", () => ({
    getAuthorizedUserRoleIdByTitle: jest.fn().mockResolvedValue(1),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
}));

global.fetch = jest.fn();

//Comment this out if working on error testing (suppresses console error logs from error mocking)

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { }); // Suppress console errors
    jest.spyOn(console, "warn").mockImplementation(() => { }); // Suppress console warnings
});

beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
    process.env.STRAPI_ACCESS_TOKEN = "test-token";
});

describe("Groups Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test-api-url";
        process.env.STRAPI_ACCESS_TOKEN = "test-token";
    });

    describe("getManagedGroups", () => {
        it("should fetch and return groups managed by the authorized user", async () => {
            const authorizedUserId = 5;
            const mockManagedGroups = [
                {
                    id: 1,
                    groupName: "Test Group 1",
                    slug: "test-group-1",
                    semester: "Fall 2023",
                    isArchived: false,
                    members: [{ id: 10, email: "user1@northeastern.edu" }],
                    admins: [{ id: 5, email: "admin@northeastern.edu" }],
                    managers: [],
                    creator: { id: 5, email: "admin@northeastern.edu" },
                },
            ];

            fetchAPI.mockResolvedValueOnce(mockManagedGroups);

            const result = await getManagedGroups(authorizedUserId);

            // Verify result matches expected data
            expect(result).toEqual(mockManagedGroups);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    sort: ["groupName:asc"],
                    filters: {
                        $or: [
                            { creator: { id: { $eq: authorizedUserId } } },
                            { admins: { id: { $eq: authorizedUserId } } },
                            { managers: { id: { $eq: authorizedUserId } } },
                        ],
                    },
                    populate: {
                        members: {
                            fields: ["id", "email"],
                        },
                        admins: {
                            fields: ["id", "email"],
                        },
                        managers: {
                            fields: ["id", "email"],
                        },
                        creator: {
                            fields: ["id", "email"],
                        },
                    },
                    fields: ["id", "groupName", "slug", "semester", "isArchived"],
                    pagination: { pageSize: 25, page: 1 },
                }),
                cache: "no-store",
            });
        });

        it("should handle custom parameters", async () => {
            const authorizedUserId = 5;
            const customParams = {
                sort: ["semester:desc"],
                pagination: { pageSize: 50, page: 2 },
                fields: ["id", "groupName", "isArchived"],
            };

            fetchAPI.mockResolvedValueOnce([]);

            await getManagedGroups(authorizedUserId, customParams);

            // Verify custom parameters were passed to fetchAPI
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    sort: ["semester:desc"],
                    pagination: { pageSize: 50, page: 2 },
                    fields: ["id", "groupName", "isArchived"],
                }),
                cache: "no-store",
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const authorizedUserId = 5;

            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to fetch managed groups"),
            );

            await expect(getManagedGroups(authorizedUserId)).rejects.toThrow(
                "Failed to fetch managed groups",
            );
        });
    });

    describe("getGroupBySlug", () => {
        it("should fetch and return a group by its slug", async () => {
            const slug = "test-group";
            const authorizedUserId = 5;
            const mockGroup = {
                id: 1,
                groupName: "Test Group",
                slug: "test-group",
                members: [{ id: 10, email: "user1@northeastern.edu" }],
                admins: [{ id: 5, email: "admin@northeastern.edu" }],
                managers: [],
                creator: { id: 5, email: "admin@northeastern.edu" },
            };

            fetchAPI.mockResolvedValueOnce([mockGroup]);

            const result = await getGroupBySlug(slug, authorizedUserId);

            // Verify result matches expected data
            expect(result).toEqual(mockGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    filters: {
                        slug: { $eq: slug },
                        $or: [
                            { creator: { id: { $eq: authorizedUserId } } },
                            { admins: { id: { $eq: authorizedUserId } } },
                            { managers: { id: { $eq: authorizedUserId } } },
                        ],
                    },
                    populate: {
                        members: {
                            fields: ["id", "email"],
                        },
                        admins: {
                            fields: ["id", "email"],
                        },
                        managers: {
                            fields: ["id", "email"],
                        },
                        creator: {
                            fields: ["id", "email"],
                        },
                    },
                    pagination: {
                        pageSize: 1,
                        page: 1,
                    },
                }),
                cache: "no-store",
            });
        });

        it("should return null if no group is found", async () => {
            const slug = "non-existent-group";
            const authorizedUserId = 5;

            fetchAPI.mockResolvedValueOnce([]);

            const result = await getGroupBySlug(slug, authorizedUserId);

            expect(result).toBeNull();
        });

        it("should use custom population options when provided", async () => {
            const slug = "test-group";
            const authorizedUserId = 5;
            const customPopulate = {
                members: {
                    fields: ["id", "email", "firstName", "lastName"],
                },
                droplets: {
                    fields: ["id", "name", "slug"],
                },
            };

            fetchAPI.mockResolvedValueOnce([]);

            await getGroupBySlug(slug, authorizedUserId, {
                populate: customPopulate,
            });

            // Verify custom populate options were passed to fetchAPI
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    populate: customPopulate,
                }),
                cache: "no-store",
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const slug = "test-group";
            const authorizedUserId = 5;

            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to fetch group by slug"),
            );

            await expect(getGroupBySlug(slug, authorizedUserId)).rejects.toThrow(
                "Failed to fetch group by slug",
            );
        });
    });

    describe("getGroupByID", () => {
        const { revalidatePath } = require("next/cache");

        it("should fetch and return a group by its ID", async () => {
            const groupId = 1;
            const mockGroup = {
                id: 1,
                groupName: "Test Group",
                slug: "test-group",
                members: [
                    {
                        id: 10,
                        email: "user1@northeastern.edu",
                        playlists: [{ id: 1, name: "Playlist 1" }],
                    },
                ],
                admins: [{ id: 5, email: "admin@northeastern.edu" }],
                managers: [],
                creator: { id: 5, email: "admin@northeastern.edu" },
                droplets: [{ id: 1 }],
                playlists: [
                    {
                        id: 1,
                        name: "Playlist 1",
                        slug: "playlist-1",
                        droplets: [
                            {
                                id: 1,
                                name: "Droplet 1",
                                slug: "droplet-1",
                                type: "skill",
                                focusArea: "Programming",
                            },
                        ],
                    },
                ],
            };

            fetchAPI.mockResolvedValueOnce([mockGroup]);

            const result = await getGroupByID(groupId);

            // Verify result matches expected data
            expect(result).toEqual(mockGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    filters: {
                        id: { $eq: groupId },
                    },
                    pagination: {
                        pageSize: 1,
                        page: 1,
                    },
                }),
                cache: "no-store",
            });

            // Verify revalidatePath was called for paths that need refreshing
            expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
            expect(revalidatePath).toHaveBeenCalledWith("/explore");
        });

        it("should use custom population options when provided", async () => {
            const groupId = 1;
            const customPopulate = {
                members: {
                    fields: ["id", "email"],
                },
            };

            fetchAPI.mockResolvedValueOnce([{ id: 1 }]);

            await getGroupByID(groupId, { populate: customPopulate });

            // Verify custom populate options were passed to fetchAPI
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    populate: customPopulate,
                }),
                cache: "no-store",
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const groupId = 1;

            fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch group by ID"));

            await expect(getGroupByID(groupId)).rejects.toThrow(
                "Failed to fetch group by ID",
            );
        });
    });

    describe("getUserGroups", () => {
        it("should fetch and return all groups the user belongs to", async () => {
            const authorizedUserId = 5;
            const mockUserGroups = [
                {
                    id: 1,
                    groupName: "Test Group 1",
                    slug: "test-group-1",
                    semester: "Fall 2023",
                    isArchived: false,
                },
                {
                    id: 2,
                    groupName: "Test Group 2",
                    slug: "test-group-2",
                    semester: "Spring 2024",
                    isArchived: false,
                },
            ];

            fetchAPI.mockResolvedValueOnce(mockUserGroups);

            const result = await getUserGroups(authorizedUserId);

            // Verify result matches expected data
            expect(result).toEqual(mockUserGroups);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    sort: ["groupName:asc"],
                    filters: {
                        $or: [
                            { creator: { id: { $eq: authorizedUserId } } },
                            { admins: { id: { $eq: authorizedUserId } } },
                            { managers: { id: { $eq: authorizedUserId } } },
                            { members: { id: { $eq: authorizedUserId } } },
                        ],
                    },
                    fields: ["id", "groupName", "slug", "semester", "isArchived"],
                    pagination: { pageSize: 25, page: 1 },
                }),
                cache: "no-store",
            });
        });

        it("should handle custom parameters and additional filters", async () => {
            const authorizedUserId = 5;
            const customParams = {
                sort: ["semester:desc"],
                filters: {
                    isArchived: { $eq: false },
                },
                pagination: { pageSize: 50, page: 2 },
            };

            fetchAPI.mockResolvedValueOnce([]);

            await getUserGroups(authorizedUserId, customParams);

            // Verify custom parameters were passed to fetchAPI
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    sort: ["semester:desc"],
                    filters: {
                        isArchived: { $eq: false },
                        $or: expect.any(Array),
                    },
                    pagination: { pageSize: 50, page: 2 },
                }),
                cache: "no-store",
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const authorizedUserId = 5;

            fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch user groups"));

            await expect(getUserGroups(authorizedUserId)).rejects.toThrow(
                "Failed to fetch user groups",
            );
        });
    });

    describe("updateGroupMembers", () => {
        it("should update group members by connecting new users", async () => {
            const groupId = 1;
            const updates = {
                connect: { role: "members", userIds: [10, 11] },
            };

            const mockUpdatedGroup = {
                id: 1,
                groupName: "Test Group",
                members: [
                    { id: 10, email: "user10@northeastern.edu" },
                    { id: 11, email: "user11@northeastern.edu" },
                ],
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await updateGroupMembers(groupId, updates);

            // Verify result matches expected data
            expect(result).toEqual(mockUpdatedGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            members: { connect: [10, 11] },
                        },
                    }),
                },
            });
        });

        it("should update group members by disconnecting users", async () => {
            const groupId = 1;
            const updates = {
                disconnect: { role: "managers", userIds: [15] },
            };

            const mockUpdatedGroup = {
                id: 1,
                groupName: "Test Group",
                managers: [],
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await updateGroupMembers(groupId, updates);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            managers: { disconnect: [15] },
                        },
                    }),
                },
            });
        });

        it("should handle both connecting and disconnecting users in a single update", async () => {
            const groupId = 1;
            const updates = {
                connect: { role: "admins", userIds: [20] },
                disconnect: { role: "members", userIds: [5] },
            };

            fetchAPI.mockResolvedValueOnce({ id: 1 });

            await updateGroupMembers(groupId, updates);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            admins: { connect: [20] },
                            members: { disconnect: [5] },
                        },
                    }),
                },
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const groupId = 1;
            const updates = {
                connect: { role: "members", userIds: [10] },
            };

            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to update group members"),
            );

            await expect(updateGroupMembers(groupId, updates)).rejects.toThrow(
                "Failed to update group members",
            );
        });
    });

    describe("addGroupMembers", () => {
        it("should add members to a group with default role", async () => {
            const groupId = 1;
            const userIds = [10, 11];
            const mockUpdatedGroup = {
                id: 1,
                groupName: "Test Group",
                members: [
                    { id: 10, email: "user10@northeastern.edu" },
                    { id: 11, email: "user11@northeastern.edu" },
                ],
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await addGroupMembers(groupId, userIds);

            // Verify result matches expected data
            expect(result).toEqual(mockUpdatedGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            members: { connect: userIds },
                        },
                    }),
                },
            });
        });

        it("should add users with a specified role", async () => {
            const groupId = 1;
            const userIds = [15];
            const role = "admins";

            fetchAPI.mockResolvedValueOnce({ id: 1 });

            await addGroupMembers(groupId, userIds, role);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            admins: { connect: userIds },
                        },
                    }),
                },
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const groupId = 1;
            const userIds = [10];

            fetchAPI.mockRejectedValueOnce(new Error("Failed to add group members"));

            await expect(addGroupMembers(groupId, userIds)).rejects.toThrow(
                "Failed to add group members",
            );
        });
    });

    describe("removeGroupMembers", () => {
        it("should remove members from a group with default role", async () => {
            const groupId = 1;
            const userIds = [10, 11];
            const mockUpdatedGroup = {
                id: 1,
                groupName: "Test Group",
                members: [],
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await removeGroupMembers(groupId, userIds);

            // Verify result matches expected data
            expect(result).toEqual(mockUpdatedGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            members: { disconnect: userIds },
                        },
                    }),
                },
            });
        });

        it("should remove users from a specified role", async () => {
            const groupId = 1;
            const userIds = [15];
            const role = "managers";

            fetchAPI.mockResolvedValueOnce({ id: 1 });

            await removeGroupMembers(groupId, userIds, role);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            managers: { disconnect: userIds },
                        },
                    }),
                },
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const groupId = 1;
            const userIds = [10];

            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to remove group members"),
            );

            await expect(removeGroupMembers(groupId, userIds)).rejects.toThrow(
                "Failed to remove group members",
            );
        });
    });

    describe("changeGroupMemberRole", () => {
        it("should change a user's role within a group", async () => {
            const groupId = 1;
            const userId = 5;
            const fromRole = "members";
            const toRole = "managers";

            const mockUpdatedGroup = {
                id: 1,
                groupName: "Test Group",
                members: [],
                managers: [{ id: 5, email: "user5@northeastern.edu" }],
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await changeGroupMemberRole(
                groupId,
                userId,
                fromRole,
                toRole,
            );

            // Verify result matches expected data
            expect(result).toEqual(mockUpdatedGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: expect.stringContaining(`"members":{"disconnect":[${userId}]}`),
                },
            });
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: expect.stringContaining(`"managers":{"connect":[${userId}]}`),
                },
            });
        });

        it("should handle changing from admin to member role", async () => {
            const groupId = 1;
            const userId = 5;
            const fromRole = "admins";
            const toRole = "members";

            fetchAPI.mockResolvedValueOnce({ id: 1 });

            await changeGroupMemberRole(groupId, userId, fromRole, toRole);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: expect.stringContaining(`"admins":{"disconnect":[${userId}]}`),
                },
            });
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: expect.stringContaining(`"members":{"connect":[${userId}]}`),
                },
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const groupId = 1;
            const userId = 5;
            const fromRole = "members";
            const toRole = "admins";

            fetchAPI.mockRejectedValueOnce(new Error("Failed to change member role"));

            await expect(
                changeGroupMemberRole(groupId, userId, fromRole, toRole),
            ).rejects.toThrow("Failed to change member role");
        });
    });

    describe("createGroup", () => {
        it("should create a new group with all provided fields", async () => {
            const authorizedUserId = 5;
            const groupData = {
                groupName: "Test Group",
                description: "A test group description",
                semester: "Fall 2023",
                initialMembers: {
                    admins: [10, 11],
                    managers: [12],
                    members: ["member1@northeastern.edu", "member2@northeastern.edu"],
                },
                droplets: [1, 2],
                playlists: [3, 4],
            };

            // Mock getAuthorizedUserByEmail for member emails
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 20,
                email: "member1@northeastern.edu",
            });
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 21,
                email: "member2@northeastern.edu",
            });

            const mockCreatedGroup = {
                id: 123,
                groupName: "Test Group",
                description: "A test group description",
                semester: "Fall 2023",
                slug: "random-slug-12345",
            };

            fetchAPI.mockResolvedValueOnce(mockCreatedGroup);

            const result = await createGroup(authorizedUserId, groupData);

            // Verify the result is the created group
            expect(result).toEqual(mockCreatedGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                options: {
                    method: "POST",
                    body: expect.any(String),
                },
            });

            // Parse the request body to validate its structure
            const actualBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);

            // Verify key properties are present
            expect(actualBody.data).toHaveProperty("groupName", "Test Group");
            expect(actualBody.data).toHaveProperty(
                "description",
                "A test group description",
            );
            expect(actualBody.data).toHaveProperty("semester", "Fall 2023");
            expect(actualBody.data).toHaveProperty("creator", 5);
            expect(actualBody.data).toHaveProperty(
                "slug",
                expect.stringMatching(/random-slug-\d+/),
            );

            // Verify member role assignments
            expect(actualBody.data.admins).toHaveProperty("set", [10, 11]);
            expect(actualBody.data.managers).toHaveProperty("set", [12]);
            expect(actualBody.data.members.set).toEqual([{ id: 20 }, { id: 21 }]);

            // Verify droplets and playlists
            expect(actualBody.data.droplets).toHaveProperty("connect");
            expect(actualBody.data.droplets.connect).toEqual([{ id: 1 }, { id: 2 }]);
            expect(actualBody.data.playlists).toHaveProperty("connect");
            expect(actualBody.data.playlists.connect).toEqual([{ id: 3 }, { id: 4 }]);
        });

        it("should use default semester when not provided", async () => {
            const authorizedUserId = 5;
            const groupData = {
                groupName: "Minimal Group",
            };

            const mockCreatedGroup = {
                id: 124,
                groupName: "Minimal Group",
                slug: "random-slug-67890",
                semester: "Open Membership",
            };

            fetchAPI.mockResolvedValueOnce(mockCreatedGroup);

            const result = await createGroup(authorizedUserId, groupData);

            // Verify the result
            expect(result).toEqual(mockCreatedGroup);

            // Verify request body contains default values
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);
            expect(requestBody.data).toHaveProperty("groupName", "Minimal Group");
            expect(requestBody.data).toHaveProperty("semester", "Open Membership"); // Default value
            expect(requestBody.data).toHaveProperty("creator", 5);
            expect(requestBody.data).not.toHaveProperty("droplets");
            expect(requestBody.data).not.toHaveProperty("playlists");
        });

        it("should create new authorized users for non-existing emails", async () => {
            const authorizedUserId = 5;
            const groupData = {
                groupName: "Test Group",
                initialMembers: {
                    members: ["existing@northeastern.edu", "new@northeastern.edu"],
                },
            };

            // First email exists
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 30,
                email: "existing@northeastern.edu",
            });

            // Second email doesn't exist, so createAuthorizedUserInGroup is called
            getAuthorizedUserByEmail.mockResolvedValueOnce(null);

            // Mock the fetch call for creating new user
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { id: 31 } }),
            });

            // Mock the successful group creation
            fetchAPI.mockResolvedValueOnce({ id: 125, groupName: "Test Group" });

            await createGroup(authorizedUserId, groupData);

            // Check that all expected user processing occurred
            expect(getAuthorizedUserByEmail).toHaveBeenCalledWith(
                "existing@northeastern.edu",
            );
            expect(getAuthorizedUserByEmail).toHaveBeenCalledWith(
                "new@northeastern.edu",
            );

            // Parse the body of the group creation to verify members
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);
            expect(requestBody.data.members.set).toEqual([
                { id: 30 }, // Existing user
                { id: 31 }, // Newly created user
            ]);
        });

        it("should handle errors during group creation", async () => {
            const authorizedUserId = 5;
            const groupData = {
                groupName: "Error Group",
            };

            // Mock the error
            fetchAPI.mockRejectedValueOnce(new Error("Failed to create group"));

            // Verify the error is propagated
            await expect(createGroup(authorizedUserId, groupData)).rejects.toThrow(
                "Failed to create group",
            );
        });
    });

    describe("getGroupBySlugV2", () => {
        it("should fetch a group by slug with default parameters", async () => {
            const slug = "test-group";
            const mockGroup = {
                id: 1,
                groupName: "Test Group",
                slug: "test-group",
                members: [
                    {
                        id: 10,
                        firstName: "Test",
                        lastName: "User",
                        email: "test@northeastern.edu",
                        profilePhoto: "photo.jpg",
                    },
                ],
                droplets: [
                    {
                        id: 1,
                        name: "Test Droplet",
                        slug: "test-droplet",
                        status: "published",
                        focusArea: "Programming",
                        type: "skill",
                        lessons: [
                            { id: 101, name: "Lesson 1", slug: "lesson-1", type: "video" },
                        ],
                    },
                ],
                playlists: [
                    {
                        id: 2,
                        name: "Test Playlist",
                        slug: "test-playlist",
                        isPublic: true,
                        droplets: [
                            {
                                id: 1,
                                name: "Test Droplet",
                                slug: "test-droplet",
                                type: "skill",
                            },
                        ],
                    },
                ],
            };

            fetchAPI.mockResolvedValueOnce([mockGroup]);

            const result = await getGroupBySlugV2(slug);

            // Verify result matches expected data
            expect(result).toEqual(mockGroup);

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: {
                    filters: {
                        slug: { $eq: slug },
                    },
                    populate: expect.objectContaining({
                        members: expect.objectContaining({
                            fields: expect.arrayContaining([
                                "id",
                                "email",
                                "firstName",
                                "lastName",
                                "profilePhoto",
                            ]),
                        }),
                        droplets: expect.objectContaining({
                            fields: expect.arrayContaining([
                                "id",
                                "name",
                                "slug",
                                "status",
                                "focusArea",
                                "type",
                            ]),
                            populate: expect.objectContaining({
                                lessons: expect.any(Object),
                            }),
                        }),
                        playlists: expect.objectContaining({
                            fields: expect.arrayContaining([
                                "id",
                                "name",
                                "slug",
                                "isPublic",
                            ]),
                            populate: expect.objectContaining({
                                droplets: expect.any(Object),
                            }),
                        }),
                    }),
                    fields: ["*", "dropletDueDates"],
                },
                cache: "no-store",
            });
        });

        it("should return null if no group is found", async () => {
            const slug = "non-existent-group";

            fetchAPI.mockResolvedValueOnce([]);

            const result = await getGroupBySlugV2(slug);

            expect(result).toBeNull();
        });

        it("should use custom populate and fields options when provided", async () => {
            const slug = "test-group";
            const customParams = {
                populate: {
                    members: {
                        fields: ["id", "email", "isEnabled"],
                    },
                },
                fields: ["id", "groupName", "createdAt"],
            };

            fetchAPI.mockResolvedValueOnce([{ id: 1 }]);

            await getGroupBySlugV2(slug, customParams);

            // Verify custom parameters were passed to fetchAPI
            expect(fetchAPI).toHaveBeenCalledWith("/groups", {
                urlParams: expect.objectContaining({
                    populate: customParams.populate,
                    fields: customParams.fields,
                }),
                cache: "no-store",
            });
        });

        it("should handle errors from fetchAPI", async () => {
            const slug = "error-group";

            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to fetch group by slug"),
            );

            await expect(getGroupBySlugV2(slug)).rejects.toThrow(
                "Failed to fetch group by slug",
            );
        });
    });

    describe("updateGroup", () => {
        it("should update a group with all available fields", async () => {
            const groupId = 1;
            const updateData = {
                groupName: "Updated Group",
                description: "Updated description",
                semester: "Spring 2024",
                isArchived: true,
                admins: [10, 11],
                managers: [12],
                members: [
                    { id: 20, email: "member1@northeastern.edu" },
                    { email: "member2@northeastern.edu" },
                ],
                droplets: [
                    { id: 1, name: "Droplet 1" },
                    { id: 2, name: "Droplet 2" },
                ],
                playlists: [
                    { id: 3, name: "Playlist 1" },
                    { id: 4, name: "Playlist 2" },
                ],
            };

            // Mock for ensureAuthorizedUsers
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 20,
                email: "member1@northeastern.edu",
            });
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 21,
                email: "member2@northeastern.edu",
            });

            const mockUpdatedGroup = {
                id: 1,
                groupName: "Updated Group",
                description: "Updated description",
                semester: "Spring 2024",
                isArchived: true,
            };

            fetchAPI.mockResolvedValueOnce(mockUpdatedGroup);

            const result = await updateGroup(groupId, updateData);

            // Verify result
            expect(result).toEqual(mockUpdatedGroup);

            // Verify fetchAPI was called correctly
            expect(fetchAPI).toHaveBeenCalledWith(`/groups/${groupId}`, {
                options: {
                    method: "PUT",
                    body: expect.any(String),
                },
            });

            // Verify revalidatePath was called
            expect(revalidatePath).toHaveBeenCalledWith("/admin");

            // Parse the body and check its structure
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);

            // Verify basic fields
            expect(requestBody.data).toHaveProperty("groupName", "Updated Group");
            expect(requestBody.data).toHaveProperty(
                "description",
                "Updated description",
            );
            expect(requestBody.data).toHaveProperty("semester", "Spring 2024");
            expect(requestBody.data).toHaveProperty("isArchived", true);

            // Verify relations are correctly formatted
            expect(requestBody.data.admins.set).toEqual([{ id: 10 }, { id: 11 }]);
            expect(requestBody.data.managers.set).toEqual([{ id: 12 }]);
            expect(requestBody.data.members.set).toEqual([{ id: 20 }, { id: 21 }]);
            expect(requestBody.data.droplets.set).toEqual([{ id: 1 }, { id: 2 }]);
            expect(requestBody.data.playlists.set).toEqual([{ id: 3 }, { id: 4 }]);
        });

        it("should update only specified fields", async () => {
            const groupId = 1;
            const partialUpdateData = {
                groupName: "Renamed Group",
                description: "New description",
            };

            fetchAPI.mockResolvedValueOnce({
                id: 1,
                groupName: "Renamed Group",
                description: "New description",
            });

            await updateGroup(groupId, partialUpdateData);

            // Parse the body and check that only specified fields are included
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);
            expect(requestBody.data).toHaveProperty("groupName", "Renamed Group");
            expect(requestBody.data).toHaveProperty("description", "New description");
            expect(requestBody.data).not.toHaveProperty("semester");
            expect(requestBody.data).not.toHaveProperty("isArchived");
            expect(requestBody.data).not.toHaveProperty("admins");
            expect(requestBody.data).not.toHaveProperty("managers");
            expect(requestBody.data).not.toHaveProperty("members");
            expect(requestBody.data).not.toHaveProperty("droplets");
            expect(requestBody.data).not.toHaveProperty("playlists");
        });

        it("should handle empty members array", async () => {
            const groupId = 1;
            const updateData = {
                groupName: "Updated Group",
                members: [], // Empty members array
            };

            fetchAPI.mockResolvedValueOnce({ id: 1, groupName: "Updated Group" });

            await updateGroup(groupId, updateData);

            // Verify the data structure - members should still be set with empty array
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);
            expect(requestBody.data).toHaveProperty("groupName", "Updated Group");
            expect(requestBody.data).toHaveProperty("members");
            expect(requestBody.data.members).toHaveProperty("set");
            expect(requestBody.data.members.set).toEqual([]);
        });

        it("should handle members with only email addresses", async () => {
            const groupId = 1;
            const updateData = {
                members: [
                    { email: "email1@northeastern.edu" },
                    { email: "email2@northeastern.edu" },
                ],
            };

            // Mock the user lookups
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 101,
                email: "email1@northeastern.edu",
            });
            getAuthorizedUserByEmail.mockResolvedValueOnce({
                id: 102,
                email: "email2@northeastern.edu",
            });

            fetchAPI.mockResolvedValueOnce({ id: 1 });

            await updateGroup(groupId, updateData);

            // Verify correct processing of member emails
            const requestBody = JSON.parse(fetchAPI.mock.calls[0][1].options.body);
            expect(requestBody.data.members.set).toEqual([{ id: 101 }, { id: 102 }]);
        });

        it("should handle errors during update", async () => {
            const groupId = 1;
            const updateData = {
                groupName: "Error Group",
            };

            // Mock the error
            fetchAPI.mockRejectedValueOnce(new Error("Failed to update group"));

            // Verify the error is propagated but revalidatePath is still called
            await expect(updateGroup(groupId, updateData)).rejects.toThrow(
                "Failed to update group",
            );
            expect(revalidatePath).toHaveBeenCalledWith("/admin");
        });
    });

    describe("createAuthorizedUserInGroup", () => {
        it("should successfully create an authorized user", async () => {
            // Setup test data
            const email = "test@northeastern.edu";
            const isEnabled = true;
            const roleID = 1;

            // Mock successful API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: {
                        id: 123,
                        attributes: {
                            email: "test@northeastern.edu",
                            isEnabled: true,
                        },
                    },
                }),
            });

            // Execute the function
            const result = await createAuthorizedUserInGroup(email, isEnabled);

            // Verify the result is correct
            expect(result).toEqual({
                ok: true,
                message: `User ${email} created!`,
                data: { id: 123 },
            });

            // Verify the fetch call was made with correct parameters
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/authorized-users"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: expect.stringContaining("Bearer"),
                    },
                    body: JSON.stringify({
                        data: {
                            email,
                            isEnabled,
                            roles: {
                                set: [{ id: 1 }],
                            },
                        },
                    }),
                },
            );
        });

        it("should handle API error responses", async () => {
            const email = "error@northeastern.edu";

            // Mock API error response
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: {
                        message: "Email already exists",
                    },
                }),
            });

            // Execute the function
            const result = await createAuthorizedUserInGroup(email);

            // Verify the error result
            expect(result).toEqual({
                ok: false,
                error: "Email already exists",
                data: null,
            });
        });

        it("should handle successful response with error property", async () => {
            const email = "edge-case@northeastern.edu";

            // Mock API response that is "ok" but contains an error (edge case)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    error: {
                        message: "Validation error",
                    },
                }),
            });

            // Execute the function
            const result = await createAuthorizedUserInGroup(email);

            // Verify the error result
            expect(result).toEqual({
                ok: false,
                error: "Validation error",
                data: null,
            });
        });

        it("should handle network errors", async () => {
            const email = "network-error@northeastern.edu";

            // Mock network error
            global.fetch.mockRejectedValueOnce(new Error("Network failure"));

            // Execute the function
            const result = await createAuthorizedUserInGroup(email);

            // Verify the error result
            expect(result).toEqual({
                ok: false,
                error: "Database Error: Failed to Create Authorized User.",
                data: null,
            });

            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });

/*
    describe("enrollUsers", () => {
        it("should enroll all members in all droplets and playlists", async () => {
            // Setup a mock group
            const mockGroup = {
                id: 1,
                groupName: "Test Group",
                members: [
                    { id: 10, email: "member1@northeastern.edu" },
                    { id: 11, email: "member2@northeastern.edu" }
                ],
                droplets: [
                    { id: 101, name: "Droplet 1" },
                    { id: 102, name: "Droplet 2" }
                ],
                playlists: [
                    {
                        id: 201,
                        name: "Playlist 1",
                        droplets: [
                            { id: 103, name: "Playlist Droplet 1" },
                            { id: 104, name: "Playlist Droplet 2" }
                        ]
                    }
                ]
            };

            // Mock successful enrollments
            createEnrollmentFromEmail.mockResolvedValue({ id: 1, success: true });
            enrollInPlaylist.mockResolvedValue({ success: true });

            // Execute the function
            await enrollUsers(mockGroup);

            // Verify createEnrollmentFromEmail was called for each member-droplet pair
            // - 2 members × 2 direct droplets = 4 calls
            // - 2 members × 2 playlist droplets = 4 more calls
            // Total: 8 calls
            expect(createEnrollmentFromEmail).toHaveBeenCalledTimes(8);

            // Check specific calls for direct droplets
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 101, viewedLessons: [] },
                "member1@northeastern.edu"
            );
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 102, viewedLessons: [] },
                "member1@northeastern.edu"
            );
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 101, viewedLessons: [] },
                "member2@northeastern.edu"
            );
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 102, viewedLessons: [] },
                "member2@northeastern.edu"
            );

            // Verify enrollInPlaylist was called for each member-playlist pair
            expect(enrollInPlaylist).toHaveBeenCalledTimes(2);
            expect(enrollInPlaylist).toHaveBeenCalledWith(201, 10);
            expect(enrollInPlaylist).toHaveBeenCalledWith(201, 11);

            // Verify playlist droplet enrollments
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 103, viewedLessons: [] },
                "member1@northeastern.edu"
            );
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 104, viewedLessons: [] },
                "member1@northeastern.edu"
            );
        });

        it("should handle empty members array", async () => {
            const mockGroup = {
                id: 1,
                groupName: "Empty Group",
                members: [],
                droplets: [{ id: 101 }],
                playlists: [{ id: 201 }]
            };

            await enrollUsers(mockGroup);

            // Verify no enrollment functions were called
            expect(createEnrollmentFromEmail).not.toHaveBeenCalled();
            expect(enrollInPlaylist).not.toHaveBeenCalled();
        });

        it("should handle empty droplets and playlists arrays", async () => {
            const mockGroup = {
                id: 1,
                groupName: "No Content Group",
                members: [{ id: 10, email: "member@northeastern.edu" }],
                droplets: [],
                playlists: []
            };

            await enrollUsers(mockGroup);

            // Verify no enrollment functions were called
            expect(createEnrollmentFromEmail).not.toHaveBeenCalled();
            expect(enrollInPlaylist).not.toHaveBeenCalled();
        });

        it("should handle enrollment errors and continue processing", async () => {
            const mockGroup = {
                id: 1,
                groupName: "Test Group",
                members: [{ id: 10, email: "member@northeastern.edu" }],
                droplets: [{ id: 101 }, { id: 102 }],
                playlists: []
            };

            // Mock first enrollment succeeding, second failing
            createEnrollmentFromEmail
                .mockResolvedValueOnce({ id: 1, success: true })
                .mockRejectedValueOnce(new Error("Enrollment failed"));

            // Should not throw, but log the error
            await expect(enrollUsers(mockGroup)).rejects.toThrow("Enrollment failed");

            // Verify the first enrollment was attempted
            expect(createEnrollmentFromEmail).toHaveBeenCalledWith(
                { droplet: 101, viewedLessons: [] },
                "member@northeastern.edu"
            );

            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });



    describe("assignDropletDueDate", () => {
        it("should assign a due date to a droplet for all group members", async () => {
            // Setup test data
            const date = "2023-12-31";
            const mockGroup = {
                id: 1,
                members: [
                    { id: 10, email: "member1@northeastern.edu" },
                    { id: 11, email: "member2@northeastern.edu" }
                ]
            };
            const mockDroplet = { id: 101, name: "Test Droplet" };

            // Mock no existing due dates, creating new ones
            global.fetch
                // First fetch: check for existing due dates for member 1
                .mockResolvedValueOnce({
                    json: async () => ({ data: [] })
                })
                // Second fetch: create due date for member 1
                .mockResolvedValueOnce({
                    ok: true
                })
                // Third fetch: check for existing due dates for member 2
                .mockResolvedValueOnce({
                    json: async () => ({ data: [] })
                })
                // Fourth fetch: create due date for member 2
                .mockResolvedValueOnce({
                    ok: true
                });

            // Execute the function
            const result = await assignDropletDueDate(date, mockGroup, mockDroplet);

            // Verify the result
            expect(result).toEqual({ success: true });

            // Verify API calls for checking existing due dates
            expect(global.fetch).toHaveBeenNthCalledWith(
                1,
                "http://test-api-url/api/due-dates?filters[authorized_user][id][$eq]=10&filters[droplet][id][$eq]=101&filters[group][id][$eq]=1",
                {
                    headers: {
                        Authorization: "Bearer test-token",
                    },
                }
            );

            // Verify API calls for creating due dates
            expect(global.fetch).toHaveBeenNthCalledWith(
                2,
                "http://test-api-url/api/due-dates",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-token",
                    },
                    body: JSON.stringify({
                        data: {
                            dueDate: date,
                            authorized_user: 10,
                            droplet: 101,
                            group: 1
                        }
                    })
                }
            );

            // Verify revalidatePath was called for all necessary paths
            expect(revalidatePath).toHaveBeenCalledWith("/explore");
            expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
            expect(revalidatePath).toHaveBeenCalledWith("/groups/g/[slug]", "page");
            expect(revalidatePath).toHaveBeenCalledWith("/");
        });

        it("should update existing due dates if they already exist", async () => {
            // Setup test data
            const date = "2023-12-31";
            const mockGroup = {
                id: 1,
                members: [{ id: 10, email: "member@northeastern.edu" }]
            };
            const mockDroplet = { id: 101, name: "Test Droplet" };

            // Mock existing due date found, updating it
            global.fetch
                // First fetch: check for existing due dates
                .mockResolvedValueOnce({
                    json: async () => ({
                        data: [{
                            id: 201,
                            attributes: {
                                dueDate: "2023-10-15" // Old date
                            }
                        }]
                    })
                })
                // Second fetch: update existing due date
                .mockResolvedValueOnce({
                    ok: true
                });

            // Execute the function
            const result = await assignDropletDueDate(date, mockGroup, mockDroplet);

            // Verify the result
            expect(result).toEqual({ success: true });

            // Verify API call for updating the due date
            expect(global.fetch).toHaveBeenNthCalledWith(
                2,
                "http://test-api-url/api/due-dates/201",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-token",
                    },
                    body: JSON.stringify({
                        data: {
                            dueDate: date
                        }
                    })
                }
            );
        });

        it("should handle empty group members array", async () => {
            const date = "2023-12-31";
            const mockGroup = {
                id: 1,
                members: [] // No members
            };
            const mockDroplet = { id: 101 };

            // Execute the function
            const result = await assignDropletDueDate(date, mockGroup, mockDroplet);

            // Verify the error result
            expect(result).toEqual({
                success: false,
                error: "No members found in the group"
            });

            // Verify no API calls were made
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("should handle API failure when creating due dates", async () => {
            const date = "2023-12-31";
            const mockGroup = {
                id: 1,
                members: [{ id: 10, email: "member@northeastern.edu" }]
            };
            const mockDroplet = { id: 101 };

            // Mock API failure when creating due date
            global.fetch
                // First fetch: check for existing due dates
                .mockResolvedValueOnce({
                    json: async () => ({ data: [] })
                })
                // Second fetch: fail to create due date
                .mockResolvedValueOnce({
                    ok: false,
                    text: async () => "Server error"
                });

            // Execute the function
            const result = await assignDropletDueDate(date, mockGroup, mockDroplet);

            // Verify the error result
            expect(result).toEqual({
                success: false,
                error: "Failed to process due dates for some users"
            });

            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });

        it("should handle network errors", async () => {
            const date = "2023-12-31";
            const mockGroup = {
                id: 1,
                members: [{ id: 10, email: "member@northeastern.edu" }]
            };
            const mockDroplet = { id: 101 };

            // Mock network error
            global.fetch.mockRejectedValueOnce(new Error("Network failure"));

            // Execute the function
            const result = await assignDropletDueDate(date, mockGroup, mockDroplet);

            // Verify the error result
            expect(result).toEqual({
                success: false,
                error: "Failed to process request"
            });

            // Verify error was logged
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe("assignPlaylistDueDate", () => {


        it("should assign a due date to a playlist for all group members", async () => {
            // Setup test data
            const date = "2025-03-20T05:25:50Z";
            const mockGroup = {
                id: 1,
                members: [
                    { id: 10, email: "member1@northeastern.edu" },
                    { id: 11, email: "member2@northeastern.edu" }
                ]
            };
            const mockPlaylist = { id: 201, name: "Test Playlist" };

            // Mock no existing due dates, creating new ones
            global.fetch
                // First fetch: check for existing due dates for member 1
                .mockResolvedValueOnce({
                    json: async () => ({ data: [] })
                })
                // Second fetch: create due date for member 1
                .mockResolvedValueOnce({
                    ok: true
                })
                // Third fetch: check for existing due dates for member 2
                .mockResolvedValueOnce({
                    json: async () => ({ data: [] })
                })
                // Fourth fetch: create due date for member 2
                .mockResolvedValueOnce({
                    ok: true
                });

            // Execute the function
            const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);

            // Verify the result
            expect(result).toEqual({ success: true });

            // Verify API calls for checking existing due dates
            expect(global.fetch).toHaveBeenNthCalledWith(
                1,
                "http://test-api-url/api/due-dates?filters[authorized_user][id][$eq]=10&filters[playlist][id][$eq]=201&filters[group][id][$eq]=1",
                {
                    headers: {
                        Authorization: "Bearer test-token",
                    },
                }
            );

            // Verify API calls for creating due dates
            expect(global.fetch).toHaveBeenNthCalledWith(
                2,
                "http://test-api-url/api/due-dates",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-token",
                    },
                    body: JSON.stringify({
                        data: {
                            dueDate: date,
                            authorized_user: 10,
                            playlist: 201,
                            group: 1
                        }
                    })
                }
            );

            // Verify revalidatePath was called for all necessary paths
            expect(revalidatePath).toHaveBeenCalledWith("/explore");
            expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
            expect(revalidatePath).toHaveBeenCalledWith("/groups/g/[slug]", "page");
            expect(revalidatePath).toHaveBeenCalledWith("/");
        });

        /*
    
        it("should update existing due dates if they already exist", async () => {
          // Setup test data
          const date = "2023-12-31";
          const mockGroup = {
            id: 1,
            members: [{ id: 10, email: "member@northeastern.edu" }]
          };
          const mockPlaylist = { id: 201, name: "Test Playlist" };
    
          // Mock existing due date found, updating it
          global.fetch
            // First fetch: check for existing due dates
            .mockResolvedValueOnce({
              json: async () => ({ 
                data: [{ 
                  id: 301,
                  attributes: {
                    dueDate: "2023-10-15" // Old date
                  }
                }] 
              })
            })
            // Second fetch: update existing due date
            .mockResolvedValueOnce({
              ok: true
            });
    
          // Execute the function
          const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);
    
          // Verify the result
          expect(result).toEqual({ success: true });
    
          // Verify API call for updating the due date
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://test-api-url/api/due-dates/301",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer test-token",
              },
              body: JSON.stringify({
                data: {
                  dueDate: date
                }
              })
            }
          );
        });
    
        it("should handle empty group members array", async () => {
          const date = "2023-12-31";
          const mockGroup = {
            id: 1,
            members: [] // No members
          };
          const mockPlaylist = { id: 201 };
    
          // Execute the function
          const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);
    
          // Verify the error result
          expect(result).toEqual({ 
            success: false, 
            error: "No members found in the group" 
          });
    
          // Verify no API calls were made
          expect(global.fetch).not.toHaveBeenCalled();
        });
    
        it("should handle API failure when creating due dates", async () => {
          const date = "2023-12-31";
          const mockGroup = {
            id: 1,
            members: [{ id: 10, email: "member@northeastern.edu" }]
          };
          const mockPlaylist = { id: 201 };
    
          // Mock API failure when creating due date
          global.fetch
            // First fetch: check for existing due dates
            .mockResolvedValueOnce({
              json: async () => ({ data: [] })
            })
            // Second fetch: fail to create due date
            .mockResolvedValueOnce({
              ok: false,
              text: async () => "Server error"
            });
    
          // Execute the function
          const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);
    
          // Verify the error result
          expect(result).toEqual({ 
            success: false, 
            error: "Failed to process due dates for some users" 
          });
          
          // Verify error was logged
          expect(console.error).toHaveBeenCalled();
        });
    
        it("should handle network errors", async () => {
          const date = "2023-12-31";
          const mockGroup = {
            id: 1,
            members: [{ id: 10, email: "member@northeastern.edu" }]
          };
          const mockPlaylist = { id: 201 };
    
          // Mock network error
          global.fetch.mockRejectedValueOnce(new Error("Network failure"));
    
          // Execute the function
          const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);
    
          // Verify the error result
          expect(result).toEqual({ 
            success: false, 
            error: "Failed to process request" 
          });
          
          // Verify error was logged
          expect(console.error).toHaveBeenCalled();
        });
        
        it("should set null due date to clear existing due dates", async () => {
          // Setup test data
          const date = null; // Setting null date to clear
          const mockGroup = {
            id: 1,
            members: [{ id: 10, email: "member@northeastern.edu" }]
          };
          const mockPlaylist = { id: 201, name: "Test Playlist" };
    
          // Mock existing due date found, updating it to null
          global.fetch
            // First fetch: check for existing due dates
            .mockResolvedValueOnce({
              json: async () => ({ 
                data: [{ 
                  id: 301,
                  attributes: {
                    dueDate: "2023-10-15" // Existing date to be cleared
                  }
                }] 
              })
            })
            // Second fetch: update existing due date to null
            .mockResolvedValueOnce({
              ok: true
            });
    
          // Execute the function
          const result = await assignPlaylistDueDate(date, mockGroup, mockPlaylist);
    
          // Verify the result
          expect(result).toEqual({ success: true });
    
          // Verify API call for updating the due date to null
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            "http://test-api-url/api/due-dates/301",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer test-token",
              },
              body: JSON.stringify({
                data: {
                  dueDate: null
                }
              })
            }
          );
        });
    });
    */



});
