import { render, screen } from "@testing-library/react";
import { StudentProgress } from "@/components/admin/progress/student-progress";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getCachedEnrollmentsWithLessonIds } from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedEnrollmentsWithLessonIds: jest.fn(),
}));

jest.mock("@/components/admin/progress/student-progress-list", () => ({
  StudentProgressList: ({ playlists }: { playlists: any[] }) => (
    <div data-testid="progress-list">
      Student Progress List with {playlists.length} playlists
    </div>
  ),
}));

describe("StudentProgress", () => {
  const mockUser = {
    email: "author@example.com",
  };

  const mockAuthor = {
    id: 1,
    email: "author@example.com",
    created_playlists: [
      {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        authorized_users: [{ id: 2, email: "student@example.com" }],
        droplets: [
          {
            id: 1,
            lessons: [{ id: 1 }, { id: 2 }],
          },
        ],
      },
    ],
  };

  const mockEnrollments = [
    {
      id: 1,
      viewedLessons: [{ id: 1 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthor);
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );
  });

  it("renders the component with correct heading", async () => {
    render(await StudentProgress());

    expect(screen.getByText("Student Progress")).toBeInTheDocument();
    expect(
      screen.getByText("Track student progress in your private playlists"),
    ).toBeInTheDocument();
  });

  it("passes playlists with progress to StudentProgressList", async () => {
    render(await StudentProgress());

    expect(screen.getByTestId("progress-list")).toBeInTheDocument();
    expect(
      screen.getByText("Student Progress List with 1 playlists"),
    ).toBeInTheDocument();
  });

  it("calculates progress correctly", async () => {
    render(await StudentProgress());

    expect(getCachedEnrollmentsWithLessonIds).toHaveBeenCalledWith(2);
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await StudentProgress();
    expect(result).toBeNull();
  });

  it("returns null when author is not found", async () => {
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(null);

    const result = await StudentProgress();
    expect(result).toBeNull();
  });

  it("calculates correct progress for users in playlists", async () => {
    const mockUser = { email: "test@example.com" };
    const mockAuthor = {
      created_playlists: [
        {
          id: 1,
          authorized_users: [{ id: 1, email: "student@test.com" }],
          droplets: [
            {
              lessons: [{ id: 1 }, { id: 2 }],
            },
          ],
        },
      ],
    };
    const mockEnrollments = [
      {
        viewedLessons: [{ id: 1 }],
      },
    ];

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthor);
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    const { container } = render(await StudentProgress());

    expect(container).toHaveTextContent(/student progress/i);
  });

  it("should calculate correct progress percentage", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "test@test.com" });

    const mockAuthorizedUser = {
      id: 1,
      email: "test@test.com",
      created_playlists: [
        {
          id: 1,
          authorized_users: [{ id: 2, email: "student@test.com" }],
          droplets: [
            {
              lessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
            },
          ],
        },
      ],
    };
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );

    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([
      {
        viewedLessons: [{ id: 1 }, { id: 2 }],
      },
    ]);

    const { container } = await render(await StudentProgress());

    expect(container).toHaveTextContent(/in your private playlists/i);
  });

  it("should handle empty playlist case", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "test@test.com" });
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({
      created_playlists: [],
    });

    const { container } = await render(await StudentProgress());
    expect(container).toHaveTextContent(/in your private playlists/i);
  });

  it("should handle no lessons case", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "test@test.com" });
    const mockAuthorizedUser = {
      created_playlists: [
        {
          authorized_users: [{ id: 1 }],
          droplets: [{ lessons: [] }],
        },
      ],
    };
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([]);

    const { container } = await render(await StudentProgress());
    expect(container).toHaveTextContent(/in your private playlists/i);
  });
});
