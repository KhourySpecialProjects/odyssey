const {
    getEnrollmentsByAuthorizedUser,
    getIsEnrolled,
    getIsEnrollComplete,
    changeEnrollmentRating,
    getEnrollByID,
    getDropletAverageRating
} = require("../../lib/requests/enrollment");

const { getCurrentUser } = require("../../lib/auth/session")
const { flattenAttributes } = require("../../lib/utils");
const { fetchAPI } = require("../../lib/utils");
const mockEnrollments = require("../mocks/enrollmentsMock")


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
    jest.spyOn(console, "error").mockImplementation(() => { }); // Suppress console errors
    jest.spyOn(console, "warn").mockImplementation(() => { }); // Suppress console warnings
});

afterEach(() => {
    jest.restoreAllMocks(); // Restore console after each test
});

// Mock Next.js cache functions
jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
}));

jest.mock("../../lib/auth/session", () => ({
    getCurrentUser: jest.fn(),
}));


describe("Enrollment tests", () => {
    const { revalidatePath, revalidateTag } = require("next/cache");

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getIsEnrolled", () => {
        it("should return whether an authorized user is enrolled", async () => {
            const mockEnrollment = [
                {
                    id: 1,
                    name: "Droplet 1",
                    slug: "droplet-1",
                },
            ];

            fetchAPI.mockResolvedValue(mockEnrollment);

            const result = await getIsEnrolled(1, 1);

            expect(result).toEqual(true);
        });
        it("should return false when an authorized user is not enrolled", async () => {
            fetchAPI.mockResolvedValue([]);

            const result = await getIsEnrolled(1, 1);

            expect(result).toEqual(false);
        });
        it("should handle fetch errors", async () => {
            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to fetch enrollment info"),
            );

            await expect(getIsEnrolled(1, 1)).rejects.toThrow();
        });
    });

    describe("getEnrollmentsByAuthorizedUser", () => {
        it("should find and return the enrollments corresponding to the given authorized user", async () => {
            const mockEnrollment = {
                id: 1,
                name: "Droplet 1",
                slug: "droplet-1",
            };

            fetchAPI.mockResolvedValue(mockEnrollment);
            const result = await getEnrollmentsByAuthorizedUser(1);

            expect(result).toEqual(mockEnrollment);
        });

        it("should handle fetch errors", async () => {
            fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch enrollments"));

            await expect(getEnrollmentsByAuthorizedUser(500)).rejects.toThrow();
        });
    });

    describe("getIsEnrollComplete", () => {
        it("should return if an authorized users enrollment is complete", async () => {
            const mockEnrollment = [
                {
                    id: 1,
                    isComplete: true,
                    createdAt: "2024-04-04T13:56:27.752Z",
                    updatedAt: "2024-04-04T13:56:27.752Z",
                    rating: null,
                    isFirstTime: null,
                    isArchived: null,
                    dueDate: null,
                    authorizedUser: {
                        data: {
                            attributes: {
                                email: "palmer.gi@northeastern.edu",
                                id: 5,
                            },
                        },
                    },
                    droplets: {
                        data: {
                            attributes: {
                                id: 3,
                            },
                        },
                    },
                },
            ];

            fetchAPI.mockResolvedValue(mockEnrollment);

            const result = await getIsEnrollComplete(5, 3);

            expect(result).toEqual(true);

            expect(fetchAPI).toHaveBeenCalledWith("/enrollments", {
                urlParams: expect.objectContaining({
                    filters: {
                        $and: [
                            { authorizedUser: { id: { $eq: 5 } } },
                            { droplet: { id: { $eq: 3 } } },
                        ],
                    },
                    fields: ["isComplete"],
                    pagination: {
                        pageSize: 1,
                        page: 1,
                    },
                }),
            });
        });
        it("should return false when an authorized user has not finished their enrollment", async () => {
            fetchAPI.mockResolvedValue([]);

            const result = await getIsEnrolled(1, 1);

            expect(result).toEqual(false);
        });
        it("should handle fetch errors", async () => {
            fetchAPI.mockRejectedValueOnce(
                new Error("Failed to fetch enrollment info"),
            );

            await expect(getIsEnrolled(1, 1)).rejects.toThrow();
        });
    });

    describe("getEnrollByID", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should fetch and return enrollment by ID", async () => {
            const mockEnrollment = {
                id: "123",
                attributes: {
                    authorizedUser: {
                        data: {
                            id: 1,
                            attributes: {
                                email: "test@northeastern.edu",
                            },
                        },
                    },
                    droplet: {
                        data: {
                            id: 456,
                            attributes: {
                                name: "Test Droplet",
                            },
                        },
                    },
                },
            };

            // Mock the fetchAPI function
            fetchAPI.mockResolvedValueOnce([mockEnrollment]);

            const result = await getEnrollByID("123");

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(
                "/enrollments",
                expect.objectContaining({
                    urlParams: expect.objectContaining({
                        filters: expect.objectContaining({
                            id: { $eq: "123" },
                        }),
                        pagination: {
                            pageSize: 1,
                            page: 1,
                        },
                        populate: "*",
                        fields: ["*"],
                    }),
                }),
            );

            // Verify the returned data matches expected format
            expect(result).toEqual(mockEnrollment);
        });

        it("should handle errors correctly", async () => {
            // Mock fetchAPI to throw an error
            fetchAPI.mockRejectedValueOnce(new Error("API Error"));

            // Verify the function rejects with the correct error
            await expect(getEnrollByID("123")).rejects.toThrow("Try again");
        });

        it("should use custom query parameters when provided", async () => {
            const mockEnrollment = { id: "123", attributes: {} };
            fetchAPI.mockResolvedValueOnce([mockEnrollment]);

            const customParams = {
                sort: ["createdAt:desc"],
                fields: ["id", "status"],
                populate: {
                    authorizedUser: {
                        fields: ["email"],
                    },
                },
            };

            await getEnrollByID("123", customParams);

            // Verify custom parameters were merged correctly
            expect(fetchAPI).toHaveBeenCalledWith(
                "/enrollments",
                expect.objectContaining({
                    urlParams: expect.objectContaining({
                        sort: ["createdAt:desc"],
                        fields: ["id", "status"],
                        populate: {
                            authorizedUser: {
                                fields: ["email"],
                            },
                        },
                        filters: {
                            id: { $eq: "123" },
                        },
                        pagination: {
                            pageSize: 1,
                            page: 1,
                        },
                    }),
                }),
            );
        });
    });

    describe("changeEnrollmentRating", () => {
        beforeEach(() => {
            global.fetch.mockReset();
            revalidatePath.mockReset();
            revalidateTag.mockReset();
        });

        it("should successfully update enrollment rating", async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    data: { id: 24, attributes: { rating: 3, isComplete: true } },
                }),
            };

            global.fetch.mockResolvedValueOnce(mockResponse);

            getCurrentUser.mockResolvedValueOnce({ name: "Harry", email: "hmerzin@northeastern.edu" });

            const result = await changeEnrollmentRating(3, "24");

            // Check if fetch was called with correct parameters
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/enrollments/24"),
                expect.objectContaining({
                    method: "PUT",
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                        Authorization: expect.stringContaining("Bearer"),
                    }),
                    body: JSON.stringify({
                        data: {
                            rating: 3,
                            isComplete: true,
                        },
                    }),
                }),
            );

            // Check if revalidation functions were called
            expect(revalidatePath).toHaveBeenCalledWith(
                "/p/[slug]",
                "page",
            );

            expect(revalidatePath).toHaveBeenCalledWith(
                "/dashboard",
                "page",
            );

            // Check returned result
            expect(result).toEqual({ success: true });
        });

        it("should handle API errors when updating note content", async () => {
            // Mock a failed response
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: "Bad Request",
            });

            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => { });

            const result = await changeEnrollmentRating(6, "99");

            expect(result).toEqual({ success: false, error: "Failed to rate enrollment" });
            expect(revalidatePath).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it("should handle network errors when updating note content", async () => {
            global.fetch.mockRejectedValueOnce(new Error("Network error"));

            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => { });

            const result = await changeEnrollmentRating(6, "99");

            expect(result).toEqual({ success: false, error: "Failed to rate enrollment" });
            expect(revalidatePath).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe("getDropletAverageRating", () => {
        it("should fetch and return the average rating of a Droplet", async () => {

            // Mock the fetchAPI function
            fetchAPI.mockResolvedValueOnce(flattenAttributes(mockEnrollments));

            const result = await getDropletAverageRating({ id: 456 });

            // Verify fetchAPI was called with correct parameters
            expect(fetchAPI).toHaveBeenCalledWith(
                "/enrollments",
                expect.objectContaining({
                    urlParams: expect.objectContaining({
                        filters: expect.objectContaining({
                            droplet: { id: { $eq: 456 } },
                            rating: { $notNull: true },
                        }),
                        pagination: {
                            pageSize: 1000,
                            page: 1,
                        },
                        fields: ["rating"],
                    }),
                }),
            );

            // Verify the returned data matches expected format
            expect(result).toEqual(3);
        });

        it("should return 0 when fewer than 5 ratings", async () => {
            fetchAPI.mockResolvedValueOnce([{
                id:34,
                rating: 2
            },
            {
                id:37,
                rating:1
            }])

            const result = await getDropletAverageRating({id: 456});

            expect(result).toEqual(0);
        })

        it("should return 0 when there are no enrollments", async () => {
            fetchAPI.mockResolvedValueOnce([])

            const result = await getDropletAverageRating({id: 456});

            expect(result).toEqual(0);
        })

        it("should handle errors correctly", async () => {
            // Mock fetchAPI to throw an error
            fetchAPI.mockRejectedValueOnce(new Error("API Error"));

            // Verify the function rejects with the correct error
            await expect(getDropletAverageRating({ id: 456 })).rejects.toThrow("Error getting droplet average rating");
        });
    })

});