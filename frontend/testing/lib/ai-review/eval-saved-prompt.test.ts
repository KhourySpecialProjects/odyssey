import {
  loadSavedPrompt,
  planForEstimate,
  planLessonRequests,
  runMeta,
} from "@/scripts/ai-review/lib/plan";
import { PROMPT_VERSION } from "@/lib/ai-review/prompt";
import { DEFAULT_PROMPT } from "@/lib/ai-review/system-prompt";
import { loadStoredPrompt } from "@/lib/ai-review/prompt-settings";
import type { Fixture, Rubric } from "@/scripts/ai-review/lib/files";
import type { PlannedRequest } from "@/scripts/ai-review/lib/run";
import { mockCriteria, mockSnapshot } from "@/testing/mocks/aiReviewMock";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));
jest.mock("@/lib/ai-review/prompt-settings", () => ({
  ...jest.requireActual("@/lib/ai-review/prompt-settings"),
  loadStoredPrompt: jest.fn(),
}));

const fixtures = [{ slug: "intro", snapshot: mockSnapshot }] as Fixture[];
const options = { model: "claude-sonnet-5-5", effort: "high" } as const;
const systemOf = (r: PlannedRequest) => JSON.stringify(r.params.system);

describe("loadSavedPrompt", () => {
  it("resolves the saved text against the defaults and names its version", async () => {
    (loadStoredPrompt as jest.Mock).mockResolvedValue({
      instructions: null,
      lessonScope: "Saved lesson wording",
      overallScope: null,
    });
    const saved = await loadSavedPrompt();
    expect(saved.parts.lessonScope).toBe("Saved lesson wording");
    expect(saved.parts.instructions).toBe(DEFAULT_PROMPT.instructions);
    expect(saved.version).toMatch(
      new RegExp(`^${PROMPT_VERSION.replace(/\./g, "\\.")}\\+[0-9a-f]{8}$`),
    );
  });
});

describe("planning with a saved prompt", () => {
  const prompt = { ...DEFAULT_PROMPT, lessonScope: "Saved lesson wording" };

  it("sends the saved wording in every request when given", () => {
    const planned = planForEstimate(fixtures, mockCriteria, {
      ...options,
      prompt,
    });
    expect(planned.filter((r) => r.kind === "lesson")).not.toHaveLength(0);
    for (const r of planned.filter((r) => r.kind === "lesson")) {
      expect(systemOf(r)).toContain("Saved lesson wording");
    }
  });

  it("builds exactly what it did before when no prompt is given", () => {
    const plain = planLessonRequests(fixtures, mockCriteria, options);
    const withDefault = planLessonRequests(fixtures, mockCriteria, {
      ...options,
      prompt: DEFAULT_PROMPT,
    });
    expect(plain.map((r) => r.params)).toEqual(
      withDefault.map((r) => r.params),
    );
    expect(plain.map(systemOf).join()).not.toContain("Saved lesson wording");
  });
});

describe("runMeta", () => {
  const rubric = { version: "r1", criteria: mockCriteria } as Rubric;
  const base = {
    ...options,
    batch: true,
    runs: 1,
    startedAt: "2026-11-10T00:00:00.000Z",
  };

  it("reports the code version by default", () => {
    expect(runMeta(base, rubric, fixtures, []).promptVersion).toBe(
      PROMPT_VERSION,
    );
  });

  it("reports the version it was given", () => {
    const meta = runMeta(
      { ...base, promptVersion: `${PROMPT_VERSION}+3fa9c2d1` },
      rubric,
      fixtures,
      [],
    );
    expect(meta.promptVersion).toBe(`${PROMPT_VERSION}+3fa9c2d1`);
  });
});
