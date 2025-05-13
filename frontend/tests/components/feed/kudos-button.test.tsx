import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KudosButton } from "@/components/feed/kudos-button";
import { giveKudos } from "@/lib/kudos";
import { toast } from "sonner";
import {
  AuthorizedUser,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
} from "@/types";

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
  linkedin: "",
  github: "",
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
};
const mockDroplet = {
  id: 1,
  name: "Test Droplet",
  slug: "test-droplet",
  isHidden: false,
  focusArea: "personal" as FocusArea,
  type: "knowledge" as DropletType,
  tags: [{ id: 1, name: "React" }] as Tag[],
  learningObjectives: [],
  status: "published" as DropletStatus,
  droplet_lessons: [],
};
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
        droplet="droplet"
        authUser={mockAuthUser}
      />,
    );
    expect(screen.getByText("Give Kudos")).toBeInTheDocument();
  });

  it("handles failed kudos submission", async () => {
    (giveKudos as jest.Mock).mockResolvedValue({ success: false });

    render(
      <KudosButton
        announcement={mockAnnouncement}
        droplet="droplet"
        authUser={mockAuthUser}
      />,
    );
    fireEvent.click(screen.getByText("Give Kudos"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to give kudos");
      expect(screen.getByRole("button")).toBeVisible();
    });
  });

  it("handles successful kudos submission", async () => {
    (giveKudos as jest.Mock).mockResolvedValue({ success: true });

    render(
      <KudosButton
        announcement={mockAnnouncement}
        droplet="droplet"
        authUser={mockAuthUser}
      />,
    );
    fireEvent.click(screen.getByText("Give Kudos"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Kudos given!");
    });
  });
});
