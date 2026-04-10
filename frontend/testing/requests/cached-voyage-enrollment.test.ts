import {
  getCachedVoyageEnrollment,
  getCachedVoyageEnrollmentsByUser,
} from "@/lib/requests/cached";

jest.mock("@/lib/requests/voyage-enrollment", () => ({
  getVoyageEnrollment: jest.fn(),
  getVoyageEnrollmentsByUser: jest.fn(),
}));

// All other cached.ts deps must be mocked to avoid import errors
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/requests/droplet", () => ({
  getDropletBySlug: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));
jest.mock("@/lib/requests/lesson", () => ({
  getLessonBySlug: jest.fn(),
}));
jest.mock("@/lib/requests/groups", () => ({
  getUserGroups: jest.fn(),
  getUserDueDates: jest.fn(),
}));

import {
  getVoyageEnrollment,
  getVoyageEnrollmentsByUser,
} from "@/lib/requests/voyage-enrollment";

describe("getCachedVoyageEnrollment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to getVoyageEnrollment with the correct arguments", async () => {
    const mockEnrollment = {
      id: 1,
      enrolledAt: "2026-01-01T00:00:00.000Z",
      completionPercentage: 25,
    };
    (getVoyageEnrollment as jest.Mock).mockResolvedValue(mockEnrollment);

    const result = await getCachedVoyageEnrollment(42, 10);

    expect(getVoyageEnrollment).toHaveBeenCalledWith(42, 10);
    expect(result).toEqual(mockEnrollment);
  });

  it("returns null when no enrollment exists", async () => {
    (getVoyageEnrollment as jest.Mock).mockResolvedValue(null);

    const result = await getCachedVoyageEnrollment(42, 99);

    expect(getVoyageEnrollment).toHaveBeenCalledWith(42, 99);
    expect(result).toBeNull();
  });
});

describe("getCachedVoyageEnrollmentsByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to getVoyageEnrollmentsByUser with the correct user ID", async () => {
    const mockEnrollments = [
      {
        id: 1,
        enrolledAt: "2026-01-01T00:00:00.000Z",
        completionPercentage: 50,
        voyage: { id: 10, name: "Test Voyage", slug: "test-voyage" },
      },
    ];
    (getVoyageEnrollmentsByUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    const result = await getCachedVoyageEnrollmentsByUser(42);

    expect(getVoyageEnrollmentsByUser).toHaveBeenCalledWith(42);
    expect(result).toEqual(mockEnrollments);
  });

  it("returns empty array when user has no enrollments", async () => {
    (getVoyageEnrollmentsByUser as jest.Mock).mockResolvedValue([]);

    const result = await getCachedVoyageEnrollmentsByUser(99);

    expect(getVoyageEnrollmentsByUser).toHaveBeenCalledWith(99);
    expect(result).toEqual([]);
  });
});
