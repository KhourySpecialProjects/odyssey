import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KudosButton } from "@/components/feed/kudos-button";
import { giveKudos } from "@/lib/kudos";
import { toast } from "sonner";
import { AuthorizedUser } from "@/types";
import { makeDroplet } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/kudos", () => ({
  giveKudos: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const mockAuthUser: AuthorizedUser = {
  id: 1,
  email: "test@test.com",
  roles: [],
  isEnabled: true,
  isPublic: true,
  linkedin: "",
  github: "",
  website: "",
  firstTime: false,
  firstName: "",
  lastName: "",
  bio: "",
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York",
  groups: [],
};
const mockDroplet = makeDroplet({
  id: 1,
  name: "Test Droplet",
  slug: "test-droplet",
  isHidden: false,
  focusArea: "personal",
  type: "knowledge",
  tags: [{ id: 1, slug: "react", name: "React", droplets: [] }],
  learningObjectives: [],
  status: "published",
});
const mockAnnouncement = {
  id: 1,
  type: "droplet" as const,
  content: "New droplet available!",
  firstCreated: new Date(),
  droplet: mockDroplet,
};

describe("KudosButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders button with initial state", () => {
    render(
      <KudosButton
        announcement={mockAnnouncement}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );
    // Check for the button with proper aria-label
    expect(
      screen.getByRole("button", { name: "Give kudos" }),
    ).toBeInTheDocument();

    // Check that the thumbs up icon is present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders kudos count when kudos exist", () => {
    const announcementWithKudos = {
      ...mockAnnouncement,
      kudosGiven: [{ ...mockAuthUser, id: 1, email: "user@test.com" }],
    };

    render(
      <KudosButton
        announcement={announcementWithKudos}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );

    // Check that the kudos count is displayed
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows correct aria-label when kudos already given", () => {
    const announcementWithUserKudos = {
      ...mockAnnouncement,
      kudosGiven: [{ ...mockAuthUser, id: 1, email: "test@test.com" }],
    };

    render(
      <KudosButton
        announcement={announcementWithUserKudos}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );

    // Check for the button with "already given" aria-label
    expect(
      screen.getByRole("button", { name: "Kudos already given" }),
    ).toBeInTheDocument();
  });

  it("handles failed kudos submission", async () => {
    jest.mocked(giveKudos).mockResolvedValue({ success: false });

    render(
      <KudosButton
        announcement={mockAnnouncement}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Give kudos" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to give kudos");
    });
  });

  it("handles successful kudos submission", async () => {
    jest.mocked(giveKudos).mockResolvedValue({ success: true });

    render(
      <KudosButton
        announcement={mockAnnouncement}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Give kudos" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Kudos given!");
    });
  });

  it("disables button when kudos already given", () => {
    const announcementWithUserKudos = {
      ...mockAnnouncement,
      kudosGiven: [{ ...mockAuthUser, id: 1, email: "test@test.com" }],
    };

    render(
      <KudosButton
        announcement={announcementWithUserKudos}
        droplet={mockDroplet}
        authUser={mockAuthUser}
      />,
    );

    const button = screen.getByRole("button", { name: "Kudos already given" });
    expect(button).toBeDisabled();
  });
});
