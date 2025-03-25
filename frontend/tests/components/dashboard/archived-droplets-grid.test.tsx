import { render, screen } from "@testing-library/react";
import { ArchivedDropletsGrid } from "@/components/dashboard/archived-droplets-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
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

jest.mock("@/components/dashboard/enrolled-droplets-grid-client", () => ({
  EnrolledDropletsGridClient: ({
    dropletsWithCompletion,
  }: {
    dropletsWithCompletion: any[];
  }) => (
    <div data-testid="droplets-grid">
      Showing {dropletsWithCompletion.length} archived droplets
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

    render(await ArchivedDropletsGrid());

    expect(screen.getByText("No Archived Droplets")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't archived any Droplets yet."),
    ).toBeInTheDocument();
  });

  it('displays message when no archived droplets exist', async () => {
    const mockUser = { email: 'test@example.com' };
    const mockAuthorizedUser = { id: 1 };
    const mockEnrollments = [] as Enrollment[];

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthorizedUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(mockEnrollments);

    render(await ArchivedDropletsGrid());

    expect(screen.getByText('No Archived Droplets')).toBeInTheDocument();
    expect(screen.getByText("You haven't archived any Droplets yet.")).toBeInTheDocument();
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

    render(await ArchivedDropletsGrid());

    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 archived droplets")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await ArchivedDropletsGrid();
    expect(result).toBeNull();
  });
});
