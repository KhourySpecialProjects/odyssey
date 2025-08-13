import { render, screen } from "@testing-library/react";
import { ArchivedDropletsGrid } from "@/components/dashboard/archived-droplets-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Enrollment } from "@/types";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid-client", () => ({
  EnrolledDropletsGridClient: ({
    dropletsWithCompletion,
  }: {
    dropletsWithCompletion: any[];
  }) => (
    <div data-testid="droplets-grid">
      {dropletsWithCompletion.map((d: any) => (
        <div key={d.id} data-testid={`droplet-${d.id}`}>
          Completion: {d.completionPercentage}%
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MessageHeader: ({ title }: { title: string; subtitle: string }) => (
    <h2>{title}</h2>
  ),
  MessageDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe("ArchivedDropletsGrid", () => {
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

  it("displays a message when no archived droplets are found", async () => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await ArchivedDropletsGrid({}));

    expect(screen.getByText("No Archived Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't archived any Droplets yet."),
    ).toBeInTheDocument();
  });

  it("displays message when no archived droplets exist", async () => {
    const mockUser = { email: "test@example.com" };
    const mockAuthorizedUser = { id: 1 };
    const mockEnrollments = [] as Enrollment[];

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await ArchivedDropletsGrid({}));

    expect(screen.getByText("No Archived Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't archived any Droplets yet."),
    ).toBeInTheDocument();
  });

  it("renders the grid when archived droplets are found", async () => {
    const mockEnrollments = [
      {
        isArchived: true,
        droplet: {
          id: 1,
          name: "Archived Droplet",
          lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
        viewedLessons: [],
      },
    ];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await ArchivedDropletsGrid({}));

    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await ArchivedDropletsGrid({});
    expect(result).toBeNull();
  });

  jest.mock("@/lib/auth/session", () => ({
    getCurrentUser: jest.fn(),
  }));

  jest.mock("@/lib/requests/authorized-user", () => ({
    getAuthorizedUserByEmail: jest.fn(),
  }));

  jest.mock("@/lib/requests/enrollment", () => ({
    getEnrollmentsByAuthorizedUser: jest.fn(),
  }));

  describe("Droplets Grid Components", () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
    };

    const mockEnrollments = [
      {
        droplet: {
          id: 1,
          lessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        },
        viewedLessons: [{ id: 1 }, { id: 2 }],
        isArchived: true,
      },
      {
        droplet: {
          id: 2,
          lessons: [{ id: 5 }, { id: 6 }],
        },
        viewedLessons: [{ id: 5 }, { id: 6 }],
        isArchived: false,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
        mockEnrollments,
      );
    });

    describe("ArchivedDropletsGrid", () => {
      it("should calculate correct completion percentage for archived droplets", async () => {
        const { container } = await render(await ArchivedDropletsGrid({}));

        expect(container).toHaveTextContent("Completion: 50%");
      });
    });

    describe("ArchivedDropletsGrid", () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
      };

      beforeEach(() => {
        jest.clearAllMocks();
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      });

      it("should calculate 100% completion when all lessons are completed", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [{ id: 1 }, { id: 2 }],
            },
            viewedLessons: [{ id: 1 }, { id: 2 }],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 100%");
      });

      it("should calculate 50% completion when half of lessons are completed", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
            },
            viewedLessons: [{ id: 1 }, { id: 2 }],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 50%");
      });

      it("should calculate 0% completion when no lessons are completed", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [{ id: 1 }, { id: 2 }],
            },
            viewedLessons: [],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 0%");
      });

      it("should handle droplet with no lessons", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [],
            },
            viewedLessons: [],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 0%");
      });

      it("should handle undefined lessons array", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
            },
            viewedLessons: [],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 0%");
      });

      it("should handle undefined viewedLessons array", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [{ id: 1 }, { id: 2 }],
            },
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 0%");
      });

      it("should show no archived droplets message when no archived enrollments", async () => {
        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

        render(await ArchivedDropletsGrid({}));
        expect(screen.getByText("No Archived Droplets")).toBeInTheDocument();
      });

      it("should filter out non-archived enrollments", async () => {
        const mockEnrollments = [
          {
            isArchived: true,
            droplet: {
              id: 1,
              lessons: [{ id: 1 }],
            },
            viewedLessons: [{ id: 1 }],
          },
          {
            isArchived: false,
            droplet: {
              id: 2,
              lessons: [{ id: 2 }],
            },
            viewedLessons: [{ id: 2 }],
          },
        ];

        (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
          mockEnrollments,
        );

        const { container } = await render(await ArchivedDropletsGrid({}));
        expect(container).toHaveTextContent("Completion: 100%");
        expect(screen.queryByTestId("droplet-2")).not.toBeInTheDocument();
      });

      it("should return null when user is not found", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await ArchivedDropletsGrid({});
        expect(result).toBeNull();
      });

      it("should return null when user email is not found", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: 1 });

        const result = await ArchivedDropletsGrid({});
        expect(result).toBeNull();
      });
    });
  });
});
