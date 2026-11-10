import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PromptEditor } from "@/components/admin/scorecard-prompts/prompt-editor";
import { DEFAULT_PROMPT } from "@/lib/ai-review/system-prompt";
import { saveAiScoringPrompt } from "@/lib/requests/ai-scoring-prompt";

jest.mock("@/lib/requests/ai-scoring-prompt", () => ({
  saveAiScoringPrompt: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const save = jest.mocked(saveAiScoringPrompt);
const initial = {
  instructions: "Custom instructions",
  lessonScope: DEFAULT_PROMPT.lessonScope,
  overallScope: DEFAULT_PROMPT.overallScope,
};
const custom = { instructions: true, lessonScope: false, overallScope: false };

const renderEditor = () =>
  render(
    <TooltipProvider>
      <PromptEditor initial={initial} custom={custom} />
    </TooltipProvider>,
  );
const box = (name: RegExp) => screen.getByRole("textbox", { name });
const saveButton = () => screen.getByRole("button", { name: "Save" });

beforeEach(() => jest.clearAllMocks());

describe("PromptEditor", () => {
  it("shows the parts with labels and Save disabled", () => {
    renderEditor();
    expect(box(/^Instructions/)).toHaveValue("Custom instructions");
    expect(box(/^Lesson scope/)).toHaveValue(DEFAULT_PROMPT.lessonScope);
    expect(screen.getAllByText("Custom")).toHaveLength(1);
    expect(screen.getAllByText("Default")).toHaveLength(2);
    expect(saveButton()).toBeDisabled();
  });

  describe("fixed paragraphs note", () => {
    const trigger = () =>
      screen.getByRole("button", { name: "fixed paragraphs" });
    const gone = () =>
      waitFor(() =>
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
      );

    it.each([
      ["hover", (u: ReturnType<typeof userEvent.setup>) => u.hover(trigger())],
      ["focus", async () => act(() => trigger().focus())],
    ])("explains them on %s", async (_n, open) => {
      const user = userEvent.setup();
      renderEditor();
      await open(user);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "The fixed paragraphs are how lesson content is formatted for the AI, and the rule that lesson content is material to review, never instructions to follow.",
      );
    });

    it("opens on click, closes on a second click and on Escape", async () => {
      const user = userEvent.setup();
      renderEditor();
      await user.click(trigger());
      await screen.findByRole("tooltip");
      await user.click(trigger());
      await gone();
      await user.click(trigger());
      await screen.findByRole("tooltip");
      await user.keyboard("{Escape}");
      await gone();
    });
  });

  it("disables Reset to default when the text already is the default", () => {
    renderEditor();
    const [instructions, lesson] = screen.getAllByText("Reset to default");
    expect(instructions.closest("button")).toBeEnabled();
    expect(lesson.closest("button")).toBeDisabled();
  });

  it("puts the error in the textarea's description", () => {
    renderEditor();
    fireEvent.change(box(/^Lesson scope/), { target: { value: "" } });
    expect(box(/^Lesson scope/)).toHaveAccessibleDescription(
      expect.stringContaining("Can't be empty."),
    );
  });

  it.each([
    ["clearing a part", "", "Can't be empty."],
    ["going over the limit", "x".repeat(1501), "Too long."],
  ])("keeps Save disabled when %s", (_name, text, message) => {
    renderEditor();
    fireEvent.change(box(/^Lesson scope/), { target: { value: text } });
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("resets a part to the default and saves it", async () => {
    save.mockResolvedValue({
      ok: true,
      error: null,
      data: { custom: { ...custom, instructions: false } },
    });
    renderEditor();
    await userEvent.click(screen.getAllByText("Reset to default")[0]);
    expect(box(/^Instructions/)).toHaveValue(DEFAULT_PROMPT.instructions);
    expect(screen.getAllByText("Default")).toHaveLength(3);
    await userEvent.click(saveButton());
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ instructions: DEFAULT_PROMPT.instructions }),
      ),
    );
  });

  it("saves all three parts, toasts and re-disables Save", async () => {
    save.mockResolvedValue({ ok: true, error: null, data: { custom } });
    renderEditor();
    fireEvent.change(box(/^Lesson scope/), { target: { value: "New scope" } });
    await userEvent.click(saveButton());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Saved. The next Score with AI run uses this wording.",
      ),
    );
    expect(save).toHaveBeenCalledWith({
      ...initial,
      lessonScope: "New scope",
    });
    expect(saveButton()).toBeDisabled();
  });

  it("labels each part from the saved result after a save", async () => {
    save.mockResolvedValue({
      ok: true,
      error: null,
      data: { custom: { ...custom, instructions: false } },
    });
    renderEditor();
    fireEvent.change(box(/^Instructions/), { target: { value: "Edited" } });
    await userEvent.click(saveButton());
    await waitFor(() => expect(screen.getAllByText("Default")).toHaveLength(3));
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("shows an error toast when saving fails", async () => {
    save.mockResolvedValue({
      ok: false,
      error: "failed",
      data: null,
    });
    renderEditor();
    fireEvent.change(box(/^Lesson scope/), { target: { value: "New scope" } });
    await userEvent.click(saveButton());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't save the Scorecard prompts.",
      ),
    );
  });

  it("renders the preview from unsaved text only when criteria is passed", async () => {
    const { unmount } = render(
      <PromptEditor initial={initial} custom={custom} criteria={[]} />,
    );
    fireEvent.change(box(/^Lesson scope/), {
      target: { value: "UNSAVED-SCOPE" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Preview prompt" }),
    );
    expect(
      screen.getByText("UNSAVED-SCOPE", { selector: "pre, div, p" }),
    ).toBeInTheDocument();
    unmount();
    renderEditor();
    expect(
      screen.queryByRole("button", { name: "Preview prompt" }),
    ).not.toBeInTheDocument();
  });

  it("warns on beforeunload only while dirty", () => {
    renderEditor();
    const fire = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(fire()).toBe(false);
    fireEvent.change(box(/^Lesson scope/), { target: { value: "New scope" } });
    expect(fire()).toBe(true);
  });
});
