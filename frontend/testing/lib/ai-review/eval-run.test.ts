import type Anthropic from "@anthropic-ai/sdk";
import {
  runAsBatch,
  runInOrder,
  type PlannedRequest,
} from "@/scripts/ai-review/lib/run";
import { buildDropletRequests } from "@/lib/ai-review/prompt";
import { mockCriteria, mockSnapshot } from "@/testing/mocks/aiReviewMock";

const planned: PlannedRequest[] = buildDropletRequests(
  mockSnapshot,
  mockCriteria,
  {
    model: "claude-sonnet-5-5",
    effort: "high",
    idPrefix: "r1-",
  },
).map((r) => ({ ...r, run: 1, dropletId: 7, dropletName: "Intro to Git" }));

const reply = (score: number): Anthropic.Message =>
  ({
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          scores: mockCriteria.map((c) => ({
            criterionId: c.id,
            rationale: "ok",
            score,
          })),
        }),
        citations: null,
      },
    ],
    usage: { input_tokens: 1_000_000, output_tokens: 0 },
  }) as Anthropic.Message;

beforeEach(() => {
  jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("runInOrder", () => {
  it("sends each request in order and keeps going after an error", async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(reply(4))
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(reply(2));
    const client = { messages: { create } } as unknown as Anthropic;

    const results = await runInOrder(
      client,
      planned,
      mockCriteria,
      "claude-sonnet-5-5",
    );

    expect(create.mock.calls.map(([p]) => p)).toEqual(
      planned.map((p) => p.params),
    );
    expect(results.map((r) => [r.request.customId, r.parsed.ok])).toEqual([
      ["r1-d7-l11", true],
      ["r1-d7-l12", false],
      ["r1-d7-overall", true],
    ]);
    expect(results[1].parsed).toMatchObject({
      reason: "api_error",
      detail: "Error: socket hang up",
    });
    // 1M input tokens of Sonnet 5.5 at full price
    expect(results[0].costUsd).toBeCloseTo(2);
    expect(results[0]).not.toHaveProperty("request.params");
  });
});

describe("runAsBatch", () => {
  it("matches results by custom_id, in any order, at half price", async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: "batch_1", processing_status: "in_progress" });
    const retrieve = jest.fn().mockResolvedValue({
      id: "batch_1",
      processing_status: "ended",
      request_counts: { succeeded: 2, processing: 0, errored: 1 },
    });
    const entries = [
      {
        custom_id: "r1-d7-overall",
        result: { type: "succeeded", message: reply(5) },
      },
      {
        custom_id: "r1-d7-l11",
        result: { type: "errored", error: { type: "invalid_request" } },
      },
      {
        custom_id: "someone-elses",
        result: { type: "succeeded", message: reply(1) },
      },
    ];
    const results = jest.fn().mockResolvedValue(
      (async function* () {
        yield* entries;
      })(),
    );
    const client = {
      messages: { batches: { create, retrieve, results } },
    } as unknown as Anthropic;

    const out = await runAsBatch(
      client,
      planned,
      mockCriteria,
      "claude-sonnet-5-5",
      { pollMs: 0 },
    );

    expect(create).toHaveBeenCalledWith({
      requests: planned.map((p) => ({
        custom_id: p.customId,
        params: p.params,
      })),
    });
    const byId = Object.fromEntries(out.map((r) => [r.request.customId, r]));
    expect(Object.keys(byId).sort()).toEqual([
      "r1-d7-l11",
      "r1-d7-l12",
      "r1-d7-overall",
    ]);
    expect(byId["r1-d7-overall"].parsed).toMatchObject({ ok: true });
    expect(byId["r1-d7-overall"].costUsd).toBeCloseTo(1);
    expect(byId["r1-d7-l11"].parsed).toMatchObject({
      ok: false,
      reason: "api_error",
    });
    // Never returned by the batch: still reported, as a failure.
    expect(byId["r1-d7-l12"].parsed).toMatchObject({
      ok: false,
      detail: "no result returned",
    });
  });
});
