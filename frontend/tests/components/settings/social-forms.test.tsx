import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { SocialForms } from "@/app/(general)/settings/social-forms";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import { makeAuthorizedUser } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/requests/authorized-user", () => ({
  updateUserInfo: jest.fn(),
}));
jest.mock("@/lib/actions", () => ({ uploadImage: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock("browser-image-compression", () => jest.fn());
jest.mock("@/components/friends/profile-block", () => ({
  ProfileBlock: () => null,
}));
jest.mock("@/components/settings/time-zone-selector", () => () => null);
jest.mock("@/components/settings/mentor-personalization-toggle", () => ({
  MentorPersonalizationToggle: () => null,
}));

const authorizedUser = {
  ...makeAuthorizedUser(),
  id: 1,
  email: "a@b.edu",
  isPublic: false,
  profilePhoto: "https://cdn/x.png",
} as any;
const user = { name: "A B", email: "a@b.edu", roles: [] } as any;

describe("SocialForms save failures", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reverts the visibility switch and toasts an error when the save fails", async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({ ok: false });
    render(<SocialForms authorizedUser={authorizedUser} user={user} />);
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(sw).not.toBeChecked();
  });

  it("keeps the visibility switch on when the save succeeds", async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({ ok: true });
    render(<SocialForms authorizedUser={authorizedUser} user={user} />);
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);
    await waitFor(() => expect(updateUserInfo).toHaveBeenCalled());
    expect(sw).toBeChecked();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts an error and keeps the photo when removal fails", async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({ ok: false });
    render(<SocialForms authorizedUser={authorizedUser} user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();
  });

  it("toasts success when photo removal saves", async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({ ok: true });
    render(<SocialForms authorizedUser={authorizedUser} user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Profile photo removed"),
    );
  });
});
