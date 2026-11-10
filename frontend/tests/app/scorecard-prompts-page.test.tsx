import { render, screen } from "@testing-library/react";
import Page from "@/app/(general)/admin/scorecard-prompts/page";
import {
  loadPromptSavedBy,
  loadStoredPrompt,
  resolvePrompt,
} from "@/lib/ai-review/prompt-settings";
import { fetchActiveCriteria } from "@/lib/review-criteria";

jest.mock("@/lib/ai-review/prompt-settings", () => ({
  loadPromptSavedBy: jest.fn(),
  loadStoredPrompt: jest.fn(),
  resolvePrompt: jest.fn(),
}));
jest.mock("@/lib/review-criteria", () => ({ fetchActiveCriteria: jest.fn() }));
jest.mock("@/components/admin/scorecard-prompts/prompt-editor", () => ({
  PromptEditor: () => <div>editor</div>,
}));

beforeEach(() => {
  jest.mocked(loadStoredPrompt).mockResolvedValue({} as never);
  jest
    .mocked(resolvePrompt)
    .mockReturnValue({ parts: {}, custom: {} } as never);
  jest.mocked(fetchActiveCriteria).mockResolvedValue([] as never);
});

describe("Scorecard Prompts page: last saved", () => {
  it("shows who saved and when", async () => {
    jest
      .mocked(loadPromptSavedBy)
      .mockResolvedValue({ name: "Ada Lovelace", at: "2026-11-10T15:00:00Z" });
    render(await Page());
    expect(
      screen.getByText("Last saved by Ada Lovelace on Nov 10, 2026"),
    ).toBeInTheDocument();
  });

  it("shows just the date when there is no user", async () => {
    jest
      .mocked(loadPromptSavedBy)
      .mockResolvedValue({ name: null, at: "2026-11-10T15:00:00Z" });
    render(await Page());
    expect(screen.getByText("Last saved on Nov 10, 2026")).toBeInTheDocument();
  });

  it("shows nothing, and still the editor, when there is no stamp", async () => {
    jest.mocked(loadPromptSavedBy).mockResolvedValue(null);
    render(await Page());
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });
});
