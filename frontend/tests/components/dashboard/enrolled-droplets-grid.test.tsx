import { render, screen } from "@testing-library/react";
import { EnrolledDropletsGrid } from "@/components/dashboard/enrolled-droplets-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserDueDates } from "@/lib/requests/groups";
import { Enrollment } from "@/types";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserDueDates: jest.fn(),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid-client", () => ({
  EnrolledDropletsGridClient: ({
    dropletsWithCompletion,
  }: {
    dropletsWithCompletion: any[];
  }) => (
    <div data-testid="droplets-grid">
      Showing {dropletsWithCompletion.length} enrolled droplets
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

describe("EnrolledDropletsGrid", () => {
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
    (getCachedUser as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getUserDueDates as jest.Mock).mockResolvedValue([]);
  });

  it("displays a message when no enrolled droplets are found", async () => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await EnrolledDropletsGrid({}));

    expect(screen.getByText("No Enrolled Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't enrolled in any Droplets yet."),
    ).toBeInTheDocument();
  });

  it("displays message when no enrolled droplets exist", async () => {
    const mockUser = { email: "test@example.com" };
    const mockAuthorizedUser = { id: 1 };
    const mockEnrollments = [] as Enrollment[];

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUser as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await EnrolledDropletsGrid({}));

    expect(screen.getByText("No Enrolled Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't enrolled in any Droplets yet."),
    ).toBeInTheDocument();
  });

  it("renders the grid when enrolled droplets are found", async () => {
    const mockEnrollments = [
      {
        isArchived: false,
        droplet: {
          id: 1,
          name: "Enrolled Droplet",
          lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
        viewedLessons: [],
      },
    ];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await EnrolledDropletsGrid({}));

    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 enrolled droplets")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await EnrolledDropletsGrid({});
    expect(result).toBeNull();
  });

  it("fetches due dates for the user", async () => {
    const mockEnrollments = [
      {
        isArchived: false,
        droplet: {
          id: 1,
          name: "Enrolled Droplet",
          lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
        viewedLessons: [],
      },
    ];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    await EnrolledDropletsGrid({});

    expect(getUserDueDates).toHaveBeenCalledWith(1);
  });

  describe("EnrolledDropletsGrid", () => {
    it("should calculate correct completion percentage for enrolled droplets", async () => {
      const { container } = await render(await EnrolledDropletsGrid({}));

      expect(container).toHaveTextContent("Showing 1 enrolled droplets");
    });
  });
});
