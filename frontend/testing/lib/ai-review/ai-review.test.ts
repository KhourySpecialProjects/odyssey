import type Anthropic from "@anthropic-ai/sdk";
import {
  AI_REVIEW_MODELS,
  costOf,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  parseEffort,
  parseModel,
} from "@/lib/ai-review/models";
import {
  buildDropletRequests,
  parseScores,
  PROMPT_VERSION,
  scoresJsonSchema,
} from "@/lib/ai-review/prompt";
import {
  dropletDetailsMarkdown,
  htmlToMarkdown,
  lessonToMarkdown,
} from "@/lib/ai-review/serialize";
import { mockCriteria, mockSnapshot } from "@/testing/mocks/aiReviewMock";

const textOf = (content: Anthropic.MessageParam["content"]) =>
  (content as Anthropic.TextBlockParam[]).map((b) => b.text);

function message(
  overrides: Partial<Anthropic.Message> & { text?: string },
): Anthropic.Message {
  const { text, ...rest } = overrides;
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    content:
      text === undefined ? [] : [{ type: "text", text, citations: null }],
    usage: { input_tokens: 10, output_tokens: 10 },
    ...rest,
  } as Anthropic.Message;
}

const answer = (
  scores: { criterionId: number; score: number; rationale?: string }[],
) =>
  JSON.stringify({
    scores: scores.map((s) => ({ rationale: "Because.", ...s })),
  });

describe("models", () => {
  it("allows only Sonnet 5.5 and Haiku 5.5, defaulting to Sonnet at high effort", () => {
    expect(AI_REVIEW_MODELS).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
    expect(parseModel(undefined)).toBe(DEFAULT_MODEL);
    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    expect(parseModel("claude-haiku-5-5")).toBe("claude-haiku-5-5");
    expect(parseEffort(undefined)).toBe(DEFAULT_EFFORT);
    expect(DEFAULT_EFFORT).toBe("high");
  });

  it.each([
    "claude-opus-5-5",
    "claude-fable-5-1",
    "claude-sonnet-5",
    "gpt-5",
    "",
  ])("refuses %p", (model) => {
    expect(() => parseModel(model)).toThrow(/not allowed/);
  });

  it("refuses an unknown effort", () => {
    expect(() => parseEffort("extreme")).toThrow(/must be one of/);
  });

  it("prices input, cache writes, cache reads and output, and halves batches", () => {
    const usage = {
      input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    } as Anthropic.Usage;
    // Sonnet 5.5: 2 + 2*1.25 + 2*0.1 + 10
    expect(costOf(usage, "claude-sonnet-5-5", { batch: false })).toBeCloseTo(
      14.7,
    );
    expect(costOf(usage, "claude-sonnet-5-5", { batch: true })).toBeCloseTo(
      7.35,
    );
  });

  it("uses Haiku 5.5's higher price above 100K prompt tokens", () => {
    const small = {
      input_tokens: 1_000,
      output_tokens: 1_000,
    } as Anthropic.Usage;
    const large = {
      input_tokens: 200_000,
      output_tokens: 1_000,
    } as Anthropic.Usage;
    expect(costOf(small, "claude-haiku-5-5", { batch: false })).toBeCloseTo(
      (1_000 * 0.1 + 1_000 * 0.5) / 1e6,
    );
    expect(costOf(large, "claude-haiku-5-5", { batch: false })).toBeCloseTo(
      (200_000 * 0.5 + 1_000 * 2.5) / 1e6,
    );
  });
});

describe("htmlToMarkdown", () => {
  it("keeps headings, emphasis, lists, links and images", () => {
    const md = htmlToMarkdown(
      "<h2>Setup</h2><p>Run <code>git init</code> <strong>first</strong>, then <em>commit</em>.</p>" +
        "<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>" +
        '<ol><li>Step</li></ol><p><a href="https://git-scm.com">Docs</a> <img alt="A diagram"></p>',
    );
    expect(md).toContain("## Setup");
    expect(md).toContain("Run `git init` **first**, then *commit*.");
    expect(md).toMatch(/- One\n- Two\n {2}- Nested/);
    expect(md).toContain("1. Step");
    expect(md).toContain("[Docs](https://git-scm.com)");
    expect(md).toContain("[Image: A diagram]");
  });

  it("drops HTML comments, scripts and styling, and decodes entities", () => {
    const md = htmlToMarkdown(
      "<!--SLIDE_BREAK--><style>p{}</style><p>Tom &amp; Jerry&nbsp;run</p><script>x()</script>",
    );
    expect(md).toBe("Tom & Jerry run");
  });

  it("keeps the TeX source of rendered math", () => {
    const md = htmlToMarkdown(
      '<p>Area is <span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\pi r^2</annotation></semantics></math></span><span class="katex-html">πr2</span></span>.</p>',
    );
    expect(md).toBe("Area is $\\pi r^2$.");
  });

  it("marks an image with no alt text, since that's what an author should fix", () => {
    expect(htmlToMarkdown('<p><img src="x.png"></p>')).toBe(
      "[Image, no alt text]",
    );
  });
});

describe("lessonToMarkdown", () => {
  it("labels non-text blocks and marks the correct quiz answer", () => {
    expect(lessonToMarkdown(mockSnapshot.lessons[0])).toBe(
      "## Why\n\nGit keeps *history*.\n\n[Video: https://youtu.be/x]",
    );
    expect(lessonToMarkdown(mockSnapshot.lessons[1])).toBe(
      "[Multiple-choice quiz]\nQ1. What saves a change?\n  - (correct) git commit\n  - git push",
    );
  });

  it("reads a BlockNote (v2) lesson through the same converter the lesson page uses", () => {
    const md = lessonToMarkdown({
      id: 1,
      name: "v2",
      blocksVersion: "v2",
      blocksV2: [
        {
          id: "a",
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: "Title", styles: {} }],
          children: [],
        },
        {
          id: "b",
          type: "paragraph",
          props: {},
          content: [
            { type: "text", text: "Body text", styles: { bold: true } },
          ],
          children: [],
        },
      ] as never,
    });
    expect(md).toContain("## Title");
    expect(md).toContain("**Body text**");
  });

  it("says so when a lesson is empty", () => {
    expect(
      lessonToMarkdown({
        id: 1,
        name: "Empty",
        blocksVersion: "v1",
        blocks: [],
      }),
    ).toBe("(This lesson has no content.)");
  });
});

describe("dropletDetailsMarkdown", () => {
  it("includes what Scaffolding needs: difficulty, objectives and prerequisites", () => {
    const md = dropletDetailsMarkdown(mockSnapshot.droplet);
    expect(md).toContain("Difficulty: beginner");
    expect(md).toContain("- Make a commit");
    expect(md).toContain(
      "- Command line basics: Using a terminal (objectives: Run a command)",
    );
    expect(md).toContain("Overview:\nYou will learn **Git**.");
  });
});

describe("buildDropletRequests", () => {
  const requests = buildDropletRequests(mockSnapshot, mockCriteria, {
    model: "claude-haiku-5-5",
    effort: "medium",
    idPrefix: "r1-",
  });

  it("makes one request per lesson in order, then one Overall", () => {
    expect(requests.map((r) => [r.customId, r.kind, r.lessonId])).toEqual([
      ["r1-d7-l11", "lesson", 11],
      ["r1-d7-l12", "lesson", 12],
      ["r1-d7-overall", "overall", null],
    ]);
    for (const r of requests)
      expect(r.customId).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  });

  it("gives each lesson only the lessons before it, never later ones", () => {
    const first = textOf(requests[0].params.messages[0].content);
    const second = textOf(requests[1].params.messages[0].content);
    expect(first.join("")).toContain('name="What is Git?"');
    expect(first.join("")).not.toContain('Your first commit"');
    expect(second.join("")).toContain('name="What is Git?"');
    expect(second.at(-1)).toContain('Score lesson 2, "Your first commit"');
  });

  it("keeps a shared prefix, so the next lesson's request can reuse the cache", () => {
    const first = textOf(requests[0].params.messages[0].content);
    const second = textOf(requests[1].params.messages[0].content);
    // Everything but the closing instruction carries over unchanged.
    expect(second.slice(0, first.length - 1)).toEqual(first.slice(0, -1));
    expect(requests[0].params.system).toEqual(requests[1].params.system);
    expect(requests[0].params.cache_control).toEqual({ type: "ephemeral" });
  });

  it("uses the lesson wording for lessons and the overall wording for the Overall Score", () => {
    expect(requests[0].params.system).toContain("Is the lesson engaging?");
    expect(requests[0].params.system).not.toContain("Is the voice consistent?");
    expect(requests[2].params.system).toContain("Is the voice consistent?");
    expect(textOf(requests[2].params.messages[0].content).join("")).toContain(
      'name="Your first commit"',
    );
  });

  it("sends the chosen model and effort, adaptive thinking and the score schema", () => {
    const { params } = requests[0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.thinking).toEqual({ type: "adaptive" });
    expect(params.output_config).toEqual({
      effort: "medium",
      format: { type: "json_schema", schema: scoresJsonSchema(mockCriteria) },
    });
    expect(params).not.toHaveProperty("temperature");
  });

  it("limits criterionId to the rubric's ids and score to 1–5", () => {
    const item = (scoresJsonSchema(mockCriteria) as any).properties.scores
      .items;
    expect(item.properties.criterionId.enum).toEqual([1, 2]);
    expect(item.properties.score.enum).toEqual([1, 2, 3, 4, 5]);
    expect(item.required).toEqual(["criterionId", "rationale", "score"]);
  });

  it("never sends the client's earlier written review, which would leak the answer", () => {
    const withReview = buildDropletRequests(
      {
        ...mockSnapshot,
        droplet: { ...mockSnapshot.droplet, previousReview: "SECRET-REVIEW" },
      },
      mockCriteria,
      { model: "claude-sonnet-5-5", effort: "high", idPrefix: "r1-" },
    );
    expect(JSON.stringify(withReview)).not.toContain("SECRET-REVIEW");
  });

  it("has a prompt version for ODY-814 to save with each score", () => {
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe("parseScores", () => {
  it("returns the scores in rubric order", () => {
    const parsed = parseScores(
      message({
        text: answer([
          { criterionId: 2, score: 3 },
          { criterionId: 1, score: 5 },
        ]),
      }),
      mockCriteria,
    );
    expect(parsed).toEqual({
      ok: true,
      scores: [
        { criterionId: 1, score: 5, rationale: "Because." },
        { criterionId: 2, score: 3, rationale: "Because." },
      ],
    });
  });

  it("records a refusal with its category, never a score", () => {
    expect(
      parseScores(
        message({
          stop_reason: "refusal",
          stop_details: {
            type: "refusal",
            category: "cyber",
            explanation: null,
          },
        } as never),
        mockCriteria,
      ),
    ).toEqual({ ok: false, reason: "refusal", detail: "cyber" });
  });

  it.each([
    [
      "a cut-off answer",
      message({ stop_reason: "max_tokens", text: '{"scores":[' }),
      "max_tokens",
    ],
    ["no text", message({}), "no_text"],
    ["broken JSON", message({ text: "{nope" }), "invalid_json"],
    [
      "a score of 6",
      message({
        text: answer([
          { criterionId: 1, score: 6 },
          { criterionId: 2, score: 3 },
        ]),
      }),
      "invalid_shape",
    ],
    [
      "a criterion twice",
      message({
        text: answer([
          { criterionId: 1, score: 2 },
          { criterionId: 1, score: 3 },
        ]),
      }),
      "invalid_shape",
    ],
    [
      "a missing criterion",
      message({ text: answer([{ criterionId: 1, score: 2 }]) }),
      "missing_criteria",
    ],
    [
      "an unknown criterion",
      message({
        text: answer([
          { criterionId: 1, score: 2 },
          { criterionId: 9, score: 3 },
        ]),
      }),
      "missing_criteria",
    ],
  ])("fails on %s", (_label, msg, reason) => {
    expect(parseScores(msg, mockCriteria)).toMatchObject({ ok: false, reason });
  });
});
