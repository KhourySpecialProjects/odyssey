import { render, screen, fireEvent, within } from "@testing-library/react";
import { AuthorizedUserBlock } from "@/components/admin/users/authorized-user";
import { AuthorizedUser, TimeZone } from "@/types";

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

// DialogContent already renders a "Close" button; a second, icon-only button
// (no text, no accessible name) is the duplicate X from ODY-874.
const expectSingleCloseButton = (dialog: HTMLElement) => {
  expect(
    within(dialog).getAllByRole("button", { name: /close/i }),
  ).toHaveLength(1);
  const iconOnly = within(dialog)
    .getAllByRole("button")
    .filter((button) => !button.textContent?.trim());
  expect(iconOnly).toHaveLength(0);
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
