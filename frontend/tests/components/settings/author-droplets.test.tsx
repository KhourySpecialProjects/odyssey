import { render, screen } from "@testing-library/react";
import { AuthorDroplets } from "@/components/settings/author-droplets";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { DropletStatus, DropletType, FocusArea, TimeZone } from "@/types";
import { calculateDropletAverageRating } from "@/lib/requests/enrollment";

jest.mock("@/lib/requests/data", () => ({
  fetchDropletsByAuthor: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getDropletAverageRating: jest.fn(),
}));

describe("AuthorDroplets", () => {
  const mockAuthor = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "frontend" as FocusArea,
    type: "lesson" as DropletType,
    status: "published" as DropletStatus,
    learningObjectives: [],
    droplet_lessons: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (calculateDropletAverageRating as jest.Mock).mockResolvedValue({
      rating: 4.5,
      count: 10,
    });
  });

  it("shows empty state when no droplets", () => {
    render(<AuthorDroplets author={{ ...mockAuthor, droplets: [] }} />);
    expect(screen.getByText("You have no Droplets.")).toBeInTheDocument();
  });

  it("renders author droplets with ratings", async () => {
    render(
      <AuthorDroplets author={{ ...mockAuthor, droplets: [mockDroplet] }} />,
    );
    expect(
      screen.getByText("Here is a quick overview of some of your Droplets."),
    ).toBeInTheDocument();
  });
});
