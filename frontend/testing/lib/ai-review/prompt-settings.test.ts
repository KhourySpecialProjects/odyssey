import {
  loadStoredPrompt,
  resolvePrompt,
  type StoredPrompt,
} from "@/lib/ai-review/prompt-settings";
import { PROMPT_VERSION } from "@/lib/ai-review/prompt";
import { DEFAULT_PROMPT } from "@/lib/ai-review/system-prompt";
import { AI_SCORING_PROMPT_LIMITS } from "@/lib/validations/ai-scoring-prompt";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

const stored = (over: Partial<StoredPrompt> = {}): StoredPrompt => ({
  instructions: null,
  lessonScope: null,
  overallScope: null,
  ...over,
});

describe("resolvePrompt", () => {
  it.each([
    ["all null", stored()],
    ["whitespace only", stored({ lessonScope: "  \n " })],
    [
      "default-identical text",
      stored({ instructions: `${DEFAULT_PROMPT.instructions}\n` }),
    ],
  ])("uses the defaults and the plain version for %s", (_name, input) => {
    const resolved = resolvePrompt(input);
    expect(resolved.parts).toEqual(DEFAULT_PROMPT);
    expect(resolved.version).toBe(PROMPT_VERSION);
    expect(Object.values(resolved.custom)).toEqual([false, false, false]);
  });

  it("adds a short hash for custom text, stable per text", () => {
    const a = resolvePrompt(stored({ lessonScope: " Mine " }));
    expect(a.custom).toEqual({
      instructions: false,
      lessonScope: true,
      overallScope: false,
    });
    expect(a.parts.lessonScope).toBe("Mine");
    expect(a.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+\+[0-9a-f]{8}$/);
    expect(a.version.length).toBeLessThanOrEqual(50);
    expect(resolvePrompt(stored({ lessonScope: "Mine" })).version).toBe(
      a.version,
    );
    expect(resolvePrompt(stored({ lessonScope: "Other" })).version).not.toBe(
      a.version,
    );
  });

  it("keeps each default within its limit", () => {
    for (const key of Object.keys(AI_SCORING_PROMPT_LIMITS) as Array<
      keyof typeof AI_SCORING_PROMPT_LIMITS
    >) {
      expect(DEFAULT_PROMPT[key].length).toBeLessThanOrEqual(
        AI_SCORING_PROMPT_LIMITS[key],
      );
    }
  });
});

describe("loadStoredPrompt", () => {
  it("reads the three fields with no-store and no next option", async () => {
    jest.mocked(fetchAPI).mockResolvedValue({ lessonScope: "L" });

    expect(await loadStoredPrompt()).toEqual(stored({ lessonScope: "L" }));
    const [path, options] = jest.mocked(fetchAPI).mock.calls[0];
    expect(path).toBe("/ai-scoring-setting");
    expect(options).toEqual({
      urlParams: { fields: ["instructions", "lessonScope", "overallScope"] },
      cache: "no-store",
    });
  });

  it("throws when the read fails", async () => {
    jest.mocked(fetchAPI).mockRejectedValue(new Error("down"));
    await expect(loadStoredPrompt()).rejects.toThrow("down");
  });
});
