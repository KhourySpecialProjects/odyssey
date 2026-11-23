import { render, screen, fireEvent } from "@testing-library/react";
import { AuthorizedUserBlock } from "@/components/admin/users/authorized-user";
import { AuthorizedUser, TimeZone } from "@/types";
import { expectSingleCloseButton } from "@/testing/helpers/dialog";

jest.mock("@/lib/requests/authorized-user", () => ({
  updateUserInfo: jest.fn().mockResolvedValue({ ok: true, data: null }),
}));

jest.mock("@/lib/actions", () => ({
  uploadImage: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const user: AuthorizedUser = {
  id: 1,
  email: "jane@example.com",
  isEnabled: true,
  firstName: "Jane",
  lastName: "Doe",
  bio: "",
  profilePhoto: "",
  linkedin: "",
  github: "",
  website: "",
  firstTime: false,
  isPublic: true,
  friendships: [],
  sent_requests: [],
  received_requests: [],
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York" as TimeZone,
  roles: [],
};

describe("AuthorizedUserBlock", () => {
  it("renders exactly one close button in the edit user dialog", async () => {
    render(<AuthorizedUserBlock user={user} />);

    fireEvent.click(screen.getByRole("button", { name: /edit user/i }));

    const dialog = await screen.findByRole("dialog");
    expectSingleCloseButton(dialog);
  });

  it("renders exactly one close button in the activity dialog", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as jest.Mock;
    render(<AuthorizedUserBlock user={user} />);

    fireEvent.click(screen.getByRole("button", { name: /view activity/i }));

    const dialog = await screen.findByRole("dialog");
    expectSingleCloseButton(dialog);
  });
});
