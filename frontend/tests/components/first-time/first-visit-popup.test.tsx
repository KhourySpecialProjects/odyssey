import { render, fireEvent, act, screen } from "@testing-library/react";
import { FirstVisitPopup } from "@/components/first-time/first-visit-popup";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";
import { TimeZone } from "@/types";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import {
  createEnrollment,
  getEnrollmentsByAuthorizedUser,
} from "@/lib/requests/enrollment";
import { getDropletById } from "@/lib/requests/droplet";

jest.mock("@/lib/requests/authorized-user", () => ({
  updateUserInfo: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createSystemAnnouncement: jest.fn(),
}));

jest.mock("@/lib/actions", () => ({
  setTimeZone: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
  createEnrollment: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletById: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe("FirstVisitPopup", () => {
  const mockUser = {
    id: 1,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: true,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isPublic: false,
    website: "",
    groups: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("form validation and submission", () => {
    it("shows error when trying to close without first name", async () => {
      const { getByText } = render(<FirstVisitPopup user={mockUser} />);

      await act(async () => {
        fireEvent.click(getByText("Start Exploring"));
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Please enter your first name before continuing",
      );
      expect(updateUserInfo).not.toHaveBeenCalled();
    });

    it("shows error when trying to close without last name", async () => {
      const { getByText, getByLabelText } = render(
        <FirstVisitPopup user={mockUser} />,
      );

      const firstNameInput = getByLabelText("First name");
      fireEvent.change(firstNameInput, {
        target: { value: "John" },
      });

      await act(async () => {
        fireEvent.click(getByText("Start Exploring"));
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Please enter your last name before continuing",
      );
      expect(updateUserInfo).not.toHaveBeenCalled();
    });
  });

  describe("dialog behavior", () => {
    it("prevents closing dialog without required fields", async () => {
      const { getByRole } = render(<FirstVisitPopup user={mockUser} />);

      const dialog = await getByRole("dialog", { hidden: true });

      await act(async () => {
        fireEvent.keyDown(dialog, { key: "Escape" });
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Please enter your first name before continuing",
      );
    });

    it("allows closing dialog with all required fields", async () => {
      const { getByRole, getByLabelText } = render(
        <FirstVisitPopup user={mockUser} />,
      );

      const firstNameInput = getByLabelText("First name");
      const lastNameInput = getByLabelText("Last name");
      const timeZoneInput = getByLabelText("Choose a time zone...");

      fireEvent.change(firstNameInput, {
        target: { value: "John" },
      });
      fireEvent.change(lastNameInput, {
        target: { value: "Doe" },
      });
      fireEvent.change(timeZoneInput, {
        target: { value: "America/New_York" },
      });

      const dialog = await getByRole("dialog", { hidden: true });

      await act(async () => {
        fireEvent.keyDown(dialog, { key: "Escape" });
      });

      expect(updateUserInfo).toHaveBeenCalled();
    });
  });

  it("enrolls in the intro droplet when an enrollment's droplet is null", async () => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValueOnce([
      { id: "1", droplet: null },
    ]);
    (getDropletById as jest.Mock).mockResolvedValueOnce({ id: 43 });

    const { getByRole, getByLabelText } = render(
      <FirstVisitPopup user={mockUser} />,
    );
    fireEvent.change(getByLabelText("First name"), {
      target: { value: "John" },
    });
    fireEvent.change(getByLabelText("Last name"), {
      target: { value: "Doe" },
    });
    fireEvent.change(getByLabelText("Choose a time zone..."), {
      target: { value: "America/New_York" },
    });

    const dialog = getByRole("dialog", { hidden: true });
    await act(async () => {
      fireEvent.keyDown(dialog, { key: "Escape" });
    });

    expect(createEnrollment).toHaveBeenCalledWith({ id: 43 }, []);
  });

  it("validates form fields when attempting to close", async () => {
    render(<FirstVisitPopup user={mockUser} />);

    const startButton = screen.getByRole("button", { name: "Start Exploring" });
    await userEvent.click(startButton);

    expect(toast.error).toHaveBeenCalledWith(
      "Please enter your first name before continuing",
    );

    const firstNameInput = screen.getByPlaceholderText("First name (required)");
    await userEvent.type(firstNameInput, "John");
    await userEvent.click(startButton);

    expect(toast.error).toHaveBeenCalledWith(
      "Please enter your last name before continuing",
    );
  });
});
