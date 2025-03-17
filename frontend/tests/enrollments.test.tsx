import { render, screen } from "@testing-library/react";
import { Enrollments } from "@/components/dashboard/enrollments";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { notFound } from "next/navigation";
import { Enrollment } from "@/types";

// Mock dependencies
jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>{droplet.name}</div>
  ),
}));

describe("Enrollments", () => {
  const mockUser = {
    email: "test@example.com",
  };

  const mockAuthorizedUser = {
    id: 1,
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
  });

  it("renders a list of enrolled droplets", async () => {
    const mockEnrollments = [
      {
        id: 1,
        droplet: {
          id: 1,
          name: "Enrolled Droplet 1",
          tags: [],
          lessons: [],
        },
        viewedLessons: [],
      },
      {
        id: 2,
        droplet: {
          id: 2,
          name: "Enrolled Droplet 2",
          tags: [],
          lessons: [],
        },
        viewedLessons: [],
      },
    ];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await Enrollments());

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
  });

  it("calls notFound when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await Enrollments();

    expect(notFound).toHaveBeenCalled();
  });

  it("passes the correct parameters to getEnrollmentsByAuthorizedUser", async () => {
    const mockEnrollments = [] as Enrollment[];
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    await Enrollments();

    expect(getEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(1, {
      populate: {
        droplet: {
          populate: {
            tags: true,
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
        },
        viewedLessons: {
          fields: ["id", "name", "slug"],
        },
      },
    });
  });
});
