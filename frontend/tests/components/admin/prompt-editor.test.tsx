import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
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
  render(<PromptEditor initial={initial} custom={custom} />);
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
