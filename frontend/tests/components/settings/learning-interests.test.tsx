import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LearningInterests } from "@/components/settings/learning-interests";
import { saveLearningInterests } from "@/lib/actions/onboarding";
import { tagsToTopics } from "@/lib/onboarding-topics";

jest.mock("@/lib/actions/onboarding", () => ({
  saveLearningInterests: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

const mockedSave = jest.mocked(saveLearningInterests);
const topics = tagsToTopics([
  { id: 11, documentId: "t1", name: "Python" },
  { id: 12, documentId: "t2", name: "Resumes" },
]);
const saved = {
  goal: "career" as const,
  focusAreas: ["technical" as const],
  interestTagIds: [11],
};
const saveBtn = () => screen.getByRole("button", { name: /^save/i });

beforeEach(() => mockedSave.mockReset().mockResolvedValue({ ok: true }));

describe("LearningInterests", () => {
  it("shows saved answers as selected", () => {
    render(<LearningInterests topics={topics} initial={saved} />);
    expect(
      screen.getByRole("radio", { name: /co-op or a job/i }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: /^technical/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Python" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves the edited values", async () => {
    const user = userEvent.setup();
    render(<LearningInterests topics={topics} initial={saved} />);
    await user.click(screen.getByRole("radio", { name: /on my own/i }));
    await user.click(screen.getByRole("button", { name: "Resumes" }));
    await user.click(saveBtn());
    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: "self",
          focusAreas: ["technical"],
          interestTagIds: [11, 12],
        }),
      ),
    );
  });

  it("starts empty and requires answers for a student who skipped the quiz", async () => {
    const user = userEvent.setup();
    render(<LearningInterests topics={topics} initial={{}} />);
    expect(
      screen
        .getAllByRole("radio")
        .every(
          (r) =>
            !(r as HTMLInputElement).checked &&
            r.getAttribute("aria-checked") !== "true",
        ),
    ).toBe(true);
    await user.click(saveBtn());
    const text = screen
      .getAllByRole("alert")
      .map((a) => a.textContent)
      .join(" ");
    expect(text).toMatch(/pick one/i);
    expect(text).toMatch(/at least one area/i);
    expect(text).toMatch(/at least one topic/i);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("shows the error when the save fails", async () => {
    mockedSave.mockResolvedValue({ ok: false, error: "Couldn't save." });
    const user = userEvent.setup();
    render(<LearningInterests topics={topics} initial={saved} />);
    await user.click(saveBtn());
    expect(await screen.findByText("Couldn't save.")).toBeInTheDocument();
    expect(saveBtn()).toBeEnabled();
  });
});
