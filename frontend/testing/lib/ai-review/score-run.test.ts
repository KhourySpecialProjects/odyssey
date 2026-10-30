import Anthropic from "@anthropic-ai/sdk";
import { revalidateTag } from "next/cache";
import { fetchDropletSnapshot } from "@/lib/ai-review/droplet-snapshot";
import {
  finishRunRoute,
  heartbeatRunRoute,
  type FinishRunInput,
} from "@/lib/ai-review/run-routes";
import { runAiScoring, type ScoringRun } from "@/lib/ai-review/score-run";
import { mockCriteria, mockSnapshot } from "@/testing/mocks/aiReviewMock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/ai-review/droplet-snapshot");
jest.mock("@/lib/ai-review/run-routes");

const run: ScoringRun = {
  runId: 40,
  userId: 3,
  dropletId: 7,
  criteria: mockCriteria,
  model: "claude-sonnet-5-5",
  effort: "high",
};

const scoresJson = (score: number, why = "ok") =>
  JSON.stringify({
    scores: mockCriteria.map((c) => ({
      criterionId: c.id,
      rationale: `${why} ${c.name}`,
      score,
    })),
  });

const message = (overrides: Partial<Anthropic.Message> & { text?: string }) => {
  const { text = scoresJson(4), ...rest } = overrides;
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text, citations: null }],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 5,
    },
    ...rest,
  } as Anthropic.Message;
};

/** A client whose streamed answers come from `answers`, in order. */
function fakeClient(answers: (Anthropic.Message | Error)[]) {
  const queue = [...answers];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stream = jest.fn((_params: Anthropic.MessageCreateParams) => ({
    finalMessage: () => {
      const next = queue.shift();
      if (!next) throw new Error("no answer queued");
      return next instanceof Error
        ? Promise.reject(next)
        : Promise.resolve(next);
    },
  }));
  return {
    client: { messages: { stream } } as unknown as Anthropic,
    stream,
  };
}

const sleep = jest.fn(() => Promise.resolve());
const finished = (): FinishRunInput =>
  jest.mocked(finishRunRoute).mock.calls.at(-1)![0];
const beats = () => jest.mocked(heartbeatRunRoute).mock.calls.map(([b]) => b);
/** Lesson ids whose scores each heartbeat carried. */
const savedBy = () =>
  beats().map((b) => [...new Set(b.scores?.map((s) => s.lessonId))]);

const running = {
  ok: true as const,
  data: {
    dropletId: 7,
    run: {
      id: 40,
      documentId: "run40",
      runState: "running" as const,
      startedAt: "2026-10-29T12:00:00.000Z",
      finishedAt: null,
    },
    overCeiling: false,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.mocked(fetchDropletSnapshot).mockResolvedValue(mockSnapshot);
  jest.mocked(heartbeatRunRoute).mockResolvedValue(running);
  jest.mocked(finishRunRoute).mockResolvedValue({
    ok: true,
    data: { ...running.data, saved: 6, kept: 0, dropped: 0 },
  });
});

afterEach(() => jest.restoreAllMocks());

describe("runAiScoring", () => {
  it("saves a suggestion for every criterion on every lesson, plus the Overall Score", async () => {
    const { client, stream } = fakeClient([
      message({ text: scoresJson(4, "lesson 1") }),
      message({ text: scoresJson(3, "lesson 2") }),
      message({ text: scoresJson(5, "overall") }),
    ]);

    await runAiScoring(run, { client, sleep });

    expect(stream).toHaveBeenCalledTimes(3);
    const [first, second, overall] = stream.mock.calls.map(
      ([params]) => params,
    );
    expect(first.model).toBe("claude-sonnet-5-5");
    expect(JSON.stringify(second.messages)).toContain(
      'name=\\"What is Git?\\"',
    );
    // The Overall request carries what each lesson scored.
    expect(JSON.stringify(overall.messages)).toContain(
      "- Tone: 3. lesson 2 Tone",
    );

    expect(finishRunRoute).toHaveBeenCalledTimes(1);
    expect(beats()[1].scores).toEqual([
      {
        lessonId: 11,
        criterionId: 1,
        aiValue: 4,
        aiRationale: "lesson 1 Tone",
      },
      {
        lessonId: 11,
        criterionId: 2,
        aiValue: 4,
        aiRationale: "lesson 1 Scaffolding",
      },
    ]);
    expect(finished()).toEqual({
      runId: 40,
      userId: 3,
      runState: "done",
      failedLessons: [],
      error: null,
      inputTokens: 3 * 115,
      outputTokens: 3 * 20,
      scores: [
        {
          lessonId: null,
          criterionId: 1,
          aiValue: 5,
          aiRationale: "overall Tone",
        },
        {
          lessonId: null,
          criterionId: 2,
          aiValue: 5,
          aiRationale: "overall Scaffolding",
        },
      ],
    });
    // Marked running first, then once after each lesson.
    expect(heartbeatRunRoute).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenCalledWith("review-7");
  });

  it("keeps the other lessons when one lesson's request fails, and ends partial", async () => {
    const { client } = fakeClient([
      new Anthropic.BadRequestError(
        400,
        undefined,
        "prompt too long",
        new Headers(),
      ),
      message({}),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    const body = finished();
    expect(body.runState).toBe("partial");
    expect(body.failedLessons).toEqual([11]);
    expect(body.error).toMatch(
      /^Lesson 1 \("What is Git\?"\): api_error \(400: /,
    );
    expect(savedBy()).toEqual([[], [], [12]]);
    expect(body.scores.map((s) => s.lessonId)).toEqual([null, null]);
    expect(beats()[1].progress).toEqual({ done: [11], current: 12 });
    // A client error is not retried.
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([
    ["a refusal", message({ stop_reason: "refusal", text: "" }), /refusal/],
    ["a max_tokens stop", message({ stop_reason: "max_tokens" }), /max_tokens/],
  ])("marks the lesson failed on %s", async (_label, bad, reason) => {
    const { client } = fakeClient([message({}), bad, message({})]);

    await runAiScoring(run, { client, sleep });

    const body = finished();
    expect(body.runState).toBe("partial");
    expect(body.failedLessons).toEqual([12]);
    expect(body.error).toMatch(reason);
    expect(savedBy().flat()).not.toContain(12);
  });

  it("tells the Overall request which lesson failed", async () => {
    const { client, stream } = fakeClient([
      message({}),
      message({ stop_reason: "refusal", text: "" }),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    const overall = stream.mock.calls[2][0];
    const texts = (
      overall.messages[0].content as Anthropic.TextBlockParam[]
    ).map((b) => b.text);
    expect(texts.join("\n")).toContain(
      'Lesson 2, "Your first commit": not scored (its request failed).',
    );
  });

  it("retries a stream that broke on an overload, and leaves HTTP errors to the SDK", async () => {
    const midStream = () =>
      new Anthropic.APIError(
        undefined,
        undefined,
        "overloaded",
        undefined,
        "overloaded_error",
      );
    const { client, stream } = fakeClient([
      midStream(),
      message({}),
      // Already retried twice by the SDK (maxRetries), so not again here.
      new Anthropic.RateLimitError(429, undefined, "slow down", new Headers()),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    expect(stream).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[2000]]);
    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: [12],
    });
  });

  it("gives up on a broken stream after two retries", async () => {
    const midStream = () =>
      new Anthropic.APIError(
        undefined,
        undefined,
        "overloaded",
        undefined,
        "overloaded_error",
      );
    const { client } = fakeClient([
      midStream(),
      midStream(),
      midStream(),
      message({}),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    expect(sleep.mock.calls).toEqual([[2000], [10000]]);
    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: [11],
    });
  });

  it("gives every request a signal, so a stalled stream times out", async () => {
    const { client, stream } = fakeClient([
      message({}),
      message({}),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    for (const call of stream.mock.calls) {
      expect((call as unknown[])[1]).toEqual({
        signal: expect.any(AbortSignal),
      });
    }
  });

  it("reports the tokens spent so far with each heartbeat", async () => {
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(beats().map((b) => [b.inputTokens, b.outputTokens])).toEqual([
      [0, 0],
      [115, 20],
      [230, 40],
    ]);
  });

  it("reports progress lesson by lesson, with the lessons already scored", async () => {
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(beats().map((b) => b.progress)).toEqual([
      { done: [], current: 11 },
      { done: [11], current: 12 },
      { done: [11, 12], current: "overall" },
    ]);
    expect(savedBy()).toEqual([[], [11], [12]]);
    expect(finished().scores.map((s) => s.lessonId)).toEqual([null, null]);
  });

  it("starts on the Overall Score when the droplet has no lessons", async () => {
    jest
      .mocked(fetchDropletSnapshot)
      .mockResolvedValue({ ...mockSnapshot, lessons: [] });
    const { client } = fakeClient([message({})]);

    await runAiScoring(run, { client, sleep });

    expect(beats().map((b) => b.progress)).toEqual([
      { done: [], current: "overall" },
    ]);
  });

  it('lists a failed Overall Score as "overall" and ends partial', async () => {
    const { client } = fakeClient([
      message({}),
      message({}),
      message({ stop_reason: "refusal", text: "" }),
    ]);

    await runAiScoring(run, { client, sleep });

    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: ["overall"],
      scores: [],
    });
  });

  it("sends a heartbeat's unsaved scores again with the next one after a network blip", async () => {
    jest
      .mocked(heartbeatRunRoute)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce({ ok: false, status: 0, message: null });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(savedBy()).toEqual([[], [11], [11, 12]]);
    expect(finished().scores.map((s) => s.lessonId)).toEqual([null, null]);
    expect(finished().runState).toBe("done");
  });

  it("names the lessons a refused finish was carrying, and still ends partial", async () => {
    jest
      .mocked(heartbeatRunRoute)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce({ ok: false, status: 0, message: null });
    jest
      .mocked(finishRunRoute)
      .mockResolvedValueOnce({ ok: false, status: 400, message: "bad" });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    // Lesson 2's scores never reached a heartbeat, so they rode on finish.
    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: [12, "overall"],
      scores: [],
    });
  });

  it("drops a lesson's scores the heartbeat refuses, names it, and carries on", async () => {
    jest
      .mocked(heartbeatRunRoute)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        message: "Criterion 9 is not in this run",
      });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    // The refused heartbeat is sent again without the scores.
    expect(savedBy()).toEqual([[], [11], [], [12]]);
    expect(beats()[2].failedLessons).toEqual([11]);
    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: [11],
      error: expect.stringContaining(
        'Saving Lesson 1 ("What is Git?") failed: Criterion 9',
      ),
    });
  });

  it("retries saving after a network failure or a Strapi restart", async () => {
    jest
      .mocked(finishRunRoute)
      .mockResolvedValueOnce({ ok: false, status: 0, message: null })
      .mockResolvedValueOnce({ ok: false, status: 502, message: null });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(finishRunRoute).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[5000], [30000]]);
    expect(finished().runState).toBe("done");
  });

  it("stops retrying the save once Strapi answers that the run has ended", async () => {
    jest
      .mocked(finishRunRoute)
      .mockResolvedValueOnce({ ok: false, status: 504, message: null })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        message: "This run has already ended",
      });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(finishRunRoute).toHaveBeenCalledTimes(2);
  });

  it("never asks Strapi for the old afterReview field", async () => {
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(fetchDropletSnapshot).toHaveBeenCalledWith(
      { id: 7 },
      { previousReview: false },
    );
  });

  it("ends failed, with no scores, when every request fails", async () => {
    const refusal = () => message({ stop_reason: "refusal", text: "" });
    const { client } = fakeClient([refusal(), refusal(), refusal()]);

    await runAiScoring(run, { client, sleep });

    expect(finished()).toMatchObject({
      runState: "failed",
      failedLessons: [11, 12, "overall"],
      scores: [],
    });
    expect(finished().error).toContain("Overall Score: refusal");
  });

  it("stops without saving once the run has ended elsewhere", async () => {
    jest
      .mocked(heartbeatRunRoute)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          ...running.data,
          run: { ...running.data.run, runState: "failed" },
        },
      });
    const { client, stream } = fakeClient([
      message({}),
      message({}),
      message({}),
    ]);

    await runAiScoring(run, { client, sleep });

    expect(stream).toHaveBeenCalledTimes(1);
    expect(finishRunRoute).not.toHaveBeenCalled();
  });

  it.each([
    ["before the first lesson", 0, [11, 12, "overall"], "failed"],
    ["after the first lesson", 1, [12, "overall"], "partial"],
    // Only the Overall Score is skipped.
    ["after the last lesson", 2, ["overall"], "partial"],
  ])(
    "stops at the per-run cost ceiling %s, skips the rest and saves what it has",
    async (_label, lessonsScored, failedLessons, runState) => {
      const heartbeat = jest.mocked(heartbeatRunRoute);
      for (let i = 0; i < lessonsScored; i++) {
        heartbeat.mockResolvedValueOnce(running);
      }
      heartbeat.mockResolvedValueOnce({
        ok: true,
        data: { ...running.data, overCeiling: true },
      });
      const { client, stream } = fakeClient([
        message({}),
        message({}),
        message({}),
      ]);

      await runAiScoring(run, { client, sleep });

      expect(stream).toHaveBeenCalledTimes(lessonsScored);
      expect(finished()).toMatchObject({
        runState,
        failedLessons,
        error: "Stopped at the per-run cost ceiling",
      });
      // Each lesson scored was saved by the heartbeat after it.
      expect(beats().flatMap((b) => b.scores ?? [])).toHaveLength(
        lessonsScored * mockCriteria.length,
      );
      expect(finished().scores).toEqual([]);
    },
  );

  it("never scores when the run was already marked dead", async () => {
    jest.mocked(heartbeatRunRoute).mockResolvedValue({
      ok: false,
      status: 409,
      message: "This run has already ended",
    });
    const { client, stream } = fakeClient([]);

    await runAiScoring(run, { client, sleep });

    expect(stream).not.toHaveBeenCalled();
    expect(finishRunRoute).not.toHaveBeenCalled();
  });

  it("ends failed when the droplet can't be read", async () => {
    jest.mocked(fetchDropletSnapshot).mockResolvedValue(null);
    const { client, stream } = fakeClient([]);

    await runAiScoring(run, { client, sleep });

    expect(stream).not.toHaveBeenCalled();
    expect(finished()).toMatchObject({
      runState: "failed",
      scores: [],
      error: "The droplet could not be read.",
    });
  });

  it("still ends the run when Strapi refuses the suggestions", async () => {
    jest.mocked(finishRunRoute).mockResolvedValueOnce({
      ok: false,
      status: 400,
      message: "Lesson 12 is not part of the review's droplet",
    });
    const { client } = fakeClient([message({}), message({}), message({})]);

    await runAiScoring(run, { client, sleep });

    expect(finishRunRoute).toHaveBeenCalledTimes(2);
    // The lessons were saved by earlier heartbeats.
    expect(finished()).toMatchObject({
      runState: "partial",
      failedLessons: ["overall"],
      scores: [],
      error: "Saving failed: Lesson 12 is not part of the review's droplet",
    });
  });

  it("ends failed instead of throwing on an unexpected error", async () => {
    jest
      .mocked(fetchDropletSnapshot)
      .mockRejectedValue(new Error("Strapi is down"));
    const { client } = fakeClient([]);

    await expect(runAiScoring(run, { client, sleep })).resolves.toBeUndefined();
    expect(finished()).toMatchObject({
      runState: "failed",
      failedLessons: [],
      error: "Scoring stopped: Strapi is down",
    });
  });

  it.each([
    ["before anything was saved", 0, "failed", [11, 12, "overall"]],
    ["after a lesson was saved", 2, "partial", [12, "overall"]],
  ])(
    "ends %s with the unfinished sections listed",
    async (_label, okBeats, runState, failedLessons) => {
      const heartbeat = jest.mocked(heartbeatRunRoute);
      for (let i = 0; i < okBeats; i++)
        heartbeat.mockResolvedValueOnce(running);
      heartbeat.mockRejectedValueOnce(new Error("boom"));
      const { client } = fakeClient([message({}), message({})]);

      await runAiScoring(run, { client, sleep });

      expect(finished()).toMatchObject({ runState, failedLessons });
    },
  );
});
