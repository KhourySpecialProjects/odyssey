import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PromptPreview } from "@/components/admin/scorecard-prompts/prompt-preview";
import { CONTENT_FORMAT } from "@/lib/ai-review/system-prompt";

type User = ReturnType<typeof userEvent.setup>;

const parts = {
  instructions: "UNSAVED-INSTRUCTIONS",
  lessonScope: "UNSAVED-LESSON-SCOPE",
  overallScope: "UNSAVED-OVERALL-SCOPE",
};
const criteria = [
  {
    id: 1,
    name: "Clarity",
    order: 1,
    active: true,
    lessonDescription: "LESSON-CLARITY",
    overallDescription: "OVERALL-CLARITY",
  },
  {
    id: 2,
    name: "Depth",
    order: 2,
    active: true,
    lessonDescription: "LESSON-DEPTH",
    overallDescription: "OVERALL-DEPTH",
  },
];

async function open(list: typeof criteria | null = criteria) {
  const user = userEvent.setup();
  render(<PromptPreview parts={parts} criteria={list} />);
  await user.click(screen.getByRole("button", { name: "Preview prompt" }));
  return user;
}

const chip = () => screen.getByRole("button", { name: /^Rubric/ });

describe("PromptPreview", () => {
  it("is collapsed first, then shows the unsaved lesson text", async () => {
    const user = userEvent.setup();
    render(<PromptPreview parts={parts} criteria={criteria} />);
    expect(screen.queryByText("UNSAVED-INSTRUCTIONS")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview prompt" }));
    expect(screen.getByText("UNSAVED-INSTRUCTIONS")).toBeInTheDocument();
    expect(screen.getByText("UNSAVED-LESSON-SCOPE")).toBeInTheDocument();
    expect(screen.queryByText("UNSAVED-OVERALL-SCOPE")).not.toBeInTheDocument();
    expect(
      screen.getByText("Droplet content isn't shown."),
    ).toBeInTheDocument();
  });

  it("labels the fixed paragraphs", async () => {
    await open();
    expect(screen.getAllByText("Fixed")).toHaveLength(2);
    expect(
      screen.getByText((t) => t.includes(CONTENT_FORMAT)),
    ).toBeInTheDocument();
  });

  it("switches to Overall with its scope and descriptions", async () => {
    const user = await open();
    await user.click(screen.getByRole("radio", { name: "Overall" }));
    expect(screen.getByText("UNSAVED-OVERALL-SCOPE")).toBeInTheDocument();
    expect(screen.queryByText("UNSAVED-LESSON-SCOPE")).not.toBeInTheDocument();
    await user.click(chip());
    expect(await screen.findByText("OVERALL-CLARITY")).toBeInTheDocument();
  });

  it("says 1 criterion for a single one", async () => {
    await open(criteria.slice(0, 1));
    expect(chip()).toHaveTextContent("Rubric · 1 criterion");
  });

  describe("rubric chip", () => {
    it.each([
      ["hover", (u: User) => u.hover(chip())],
      ["focus", async () => chip().focus()],
      ["click", (u: User) => u.click(chip())],
    ])("opens on %s with the lesson descriptions", async (_n, act) => {
      const user = await open();
      expect(chip()).toHaveTextContent("Rubric · 2 criteria");
      await act(user);
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Clarity")).toBeInTheDocument();
      expect(within(dialog).getByText("LESSON-DEPTH")).toBeInTheDocument();
    });

    it("stays open after a click, and closes on Escape", async () => {
      const user = await open();
      await user.click(chip());
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("closes shortly after the pointer leaves", async () => {
      const user = await open();
      await user.hover(chip());
      await screen.findByRole("dialog");
      await user.unhover(chip());
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("says so when the rubric didn't load", async () => {
      const user = await open(null);
      await user.click(chip());
      expect(
        await screen.findByText("Couldn't load the rubric."),
      ).toBeInTheDocument();
    });
  });
});
