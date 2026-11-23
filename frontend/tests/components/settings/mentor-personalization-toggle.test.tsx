import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { MentorPersonalizationToggle } from "@/components/settings/mentor-personalization-toggle";
import { updateUserInfo } from "@/lib/requests/authorized-user";

jest.mock("@/lib/requests/authorized-user", () => ({
  updateUserInfo: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUpdate = updateUserInfo as jest.Mock;

describe("MentorPersonalizationToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ ok: true, data: null });
  });

  it.each([true, false])("renders the saved value %s", (value) => {
    render(<MentorPersonalizationToggle userId={5} initialValue={value} />);
    expect(
      screen.getByRole("switch", { name: "Personalize Mentor" }),
    ).toHaveProperty("checked", value);
    expect(
      screen.getByText(/Mentor answers everyone the same way/),
    ).toBeInTheDocument();
  });

  it("explains everything the notice lists", () => {
    render(<MentorPersonalizationToggle userId={5} initialValue={true} />);
    expect(screen.getByText(/prerequisites, and which lessons/)).toBeVisible();
  });

  it("saves on change", async () => {
    render(<MentorPersonalizationToggle userId={5} initialValue={true} />);
    fireEvent.click(screen.getByRole("switch", { name: "Personalize Mentor" }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(5, {
        mentorPersonalization: false,
      }),
    );
    expect(
      screen.getByRole("switch", { name: "Personalize Mentor" }),
    ).toHaveProperty("checked", false);
  });

  it.each([
    [
      "a failed result",
      () => mockUpdate.mockResolvedValue({ ok: false, error: "x", data: null }),
    ],
    ["a thrown error", () => mockUpdate.mockRejectedValue(new Error("boom"))],
  ])("reverts and toasts on %s", async (_n, arrange) => {
    arrange();
    render(<MentorPersonalizationToggle userId={5} initialValue={true} />);
    fireEvent.click(screen.getByRole("switch", { name: "Personalize Mentor" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(
      screen.getByRole("switch", { name: "Personalize Mentor" }),
    ).toHaveProperty("checked", true);
  });
});
