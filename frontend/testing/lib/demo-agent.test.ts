import type Anthropic from "@anthropic-ai/sdk";
import {
  AGENT_TOOLS,
  describeRef,
  estimateDollars,
  formatSnapshot,
  MAX_SNAPSHOT_CHARS,
  runAgent,
  SYSTEM_PROMPT,
  type AgentBrowser,
  type AgentConfig,
  type AgentRequest,
  type ClaudeClient,
  type ClaudeReply,
  type PageView,
  type StepRecord,
} from "@/lib/demo-agent/agent";

const SNAPSHOT = [
  "- main [ref=e1]:",
  '  - heading "Python Basics" [level=1] [ref=e2]',
  '  - button "Start" [ref=e3] [cursor=pointer]',
].join("\n");

const CONFIG: AgentConfig = {
  persona: {
    username: "student1",
    email: "student1@demo.odyssey.test",
    name: "Student 1",
    role: "Student",
    bio: "Keeps up with every due date.",
  },
  goal: "Finish the Python Basics droplet.",
  model: "claude-opus-5-5",
  effort: "medium",
  maxSteps: 10,
  maxMinutes: 15,
  maxDollars: 3,
};

function fakeBrowser(overrides: Partial<AgentBrowser> = {}) {
  const page: PageView = {
    url: "http://localhost:3001/d/python-basics",
    title: "Python Basics",
    snapshot: SNAPSHOT,
    notes: [],
  };
  return {
    view: jest.fn(async () => ({ ...page, notes: [] as string[] })),
    click: jest.fn(async () => {}),
    type: jest.fn(async () => {}),
    selectOption: jest.fn(async () => {}),
    pressKey: jest.fn(async () => {}),
    goTo: jest.fn(async () => {}),
    goBack: jest.fn(async () => {}),
    wait: jest.fn(async () => {}),
    ...overrides,
  };
}

let ids = 0;
function reply(
  content: unknown[],
  {
    stop_reason = "tool_use",
    usage = {},
  }: { stop_reason?: string; usage?: Record<string, number> } = {},
): ClaudeReply {
  return {
    kind: "message",
    message: {
      id: `msg_${++ids}`,
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content,
      stop_reason,
      stop_sequence: null,
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        ...usage,
      },
    } as unknown as Anthropic.Beta.BetaMessage,
  };
}
const thinking = { type: "thinking", thinking: "", signature: "sig" };
const call = (name: string, input: Record<string, unknown>, usage = {}) =>
  reply([thinking, { type: "tool_use", id: `toolu_${++ids}`, name, input }], {
    usage,
  });
const finish = (outcome = "done", summary = "Finished the droplet.") =>
  call("finish", { outcome, summary });

/** A client that replays `replies` and keeps a copy of every request. */
function scripted(...replies: ClaudeReply[]) {
  const requests: AgentRequest[] = [];
  const client: ClaudeClient = {
    send: jest.fn(async (request: AgentRequest) => {
      requests.push(JSON.parse(JSON.stringify(request)));
      const next = replies.shift();
      if (!next) throw new Error("No more replies");
      return next;
    }),
  };
  return { client, requests };
}

type Block = { type: string; [key: string]: unknown };
const blocks = (request: AgentRequest, index: number) =>
  request.messages[index].content as unknown as Block[];
const lastBlock = (request: AgentRequest) => {
  const content = blocks(request, request.messages.length - 1);
  return content[content.length - 1];
};

describe("runAgent", () => {
  beforeEach(() => jest.clearAllMocks());

  it("works toward the goal and stops when Claude finishes it", async () => {
    const browser = fakeBrowser();
    const steps: unknown[] = [];
    const { client } = scripted(
      call("click", { ref: "e3", why: "start the droplet" }),
      finish(),
    );

    const result = await runAgent({
      client,
      browser,
      config: CONFIG,
      onStep: (step) => steps.push(step),
    });

    expect(browser.click).toHaveBeenCalledWith("e3");
    expect(result).toMatchObject({
      outcome: "done",
      summary: "Finished the droplet.",
      problems: [],
    });
    expect(steps).toEqual([
      expect.objectContaining({
        step: 1,
        tool: "click",
        target: 'button "Start"',
        why: "start the droplet",
        page: "/d/python-basics",
      }),
      expect.objectContaining({ step: 2, tool: "finish" }),
    ]);
  });

  it("briefs Claude on who it is, its goal and the page it's on", async () => {
    const { client, requests } = scripted(finish());

    await runAgent({ client, browser: fakeBrowser(), config: CONFIG });

    const briefing = blocks(requests[0], 0)[0].text;
    expect(briefing).toContain(
      "You are Student 1 (Student). About you: Keeps up with every due date.",
    );
    expect(briefing).toContain("as student1 (student1@demo.odyssey.test)");
    expect(briefing).toContain("Your goal: Finish the Python Basics droplet.");
    expect(briefing).toContain("up to 10 turns, one tool call each");
    expect(briefing).toContain("Page: Python Basics (/d/python-basics)");
    expect(briefing).toContain('button "Start" [ref=e3]');
    expect(briefing).not.toContain("[cursor=pointer]");
  });

  it("shows Claude what its action did and the page it led to", async () => {
    const view = jest
      .fn<Promise<PageView>, []>()
      .mockResolvedValueOnce({
        url: "http://localhost:3001/d/python-basics",
        title: "Python Basics",
        snapshot: SNAPSHOT,
        notes: [],
      })
      .mockResolvedValueOnce({
        url: "http://localhost:3001/d/python-basics/1?tab=quiz",
        title: "Lesson 1",
        snapshot: '- heading "Lesson 1" [ref=e9]',
        notes: ['A confirm dialog said "Leave?" and was accepted.'],
      });
    const browser = fakeBrowser({ view });
    const { client, requests } = scripted(
      call("click", { ref: "e3", why: "start" }),
      finish(),
    );

    await runAgent({ client, browser, config: CONFIG });

    const result = lastBlock(requests[1]);
    expect(result.type).toBe("tool_result");
    expect(result.tool_use_id).toBe(blocks(requests[1], 1)[1].id);
    expect(result.is_error).toBeUndefined();
    expect(result.content).toBe(
      [
        'Done: clicked button "Start".',
        'Note: A confirm dialog said "Leave?" and was accepted.',
        "",
        "Page: Lesson 1 (/d/python-basics/1?tab=quiz)",
        "",
        '- heading "Lesson 1" [ref=e9]',
      ].join("\n"),
    );
  });

  it("never edits earlier messages, so thinking blocks stay valid", async () => {
    const { client, requests } = scripted(
      call("click", { ref: "e3", why: "start" }),
      call("type", { ref: "e3", text: "print(1)", why: "answer" }),
      call("look", { why: "check" }),
      finish(),
    );

    await runAgent({ client, browser: fakeBrowser(), config: CONFIG });

    const withoutCacheMarkers = (value: unknown) =>
      JSON.parse(
        JSON.stringify(value, (key, field) =>
          key === "cache_control" ? undefined : field,
        ),
      );
    expect(requests).toHaveLength(4);
    for (let i = 1; i < requests.length; i++) {
      const before = withoutCacheMarkers(requests[i - 1].messages);
      const after = withoutCacheMarkers(requests[i].messages);
      expect(after.slice(0, before.length)).toEqual(before);
      // Thinking blocks go back exactly as they came
      expect(after[before.length].content[0]).toEqual(thinking);
    }
  });

  it("caches the system prompt and the newest block, and clears old pages on the server", async () => {
    const { client, requests } = scripted(
      call("click", { ref: "e3", why: "start" }),
      finish(),
    );

    await runAgent({ client, browser: fakeBrowser(), config: CONFIG });

    const request = requests[1];
    expect(request.system).toEqual([
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ]);
    expect(lastBlock(request).cache_control).toEqual({ type: "ephemeral" });
    expect(JSON.stringify(request).match(/cache_control/g)).toHaveLength(2);
    expect(request).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: "medium" },
      context_management: {
        edits: [
          {
            type: "clear_tool_uses_20250919",
            trigger: { type: "input_tokens", value: 40000 },
            keep: { type: "tool_uses", value: 4 },
          },
        ],
      },
    });
    expect(request.tools.map((tool) => tool.name)).toEqual([
      "click",
      "type",
      "select_option",
      "press_key",
      "go_to",
      "go_back",
      "look",
      "finish",
    ]);
  });

  const browserCalls: [
    string,
    Record<string, unknown>,
    keyof AgentBrowser,
    unknown[],
  ][] = [
    [
      "type",
      { ref: "e3", text: "hi", submit: true, why: "w" },
      "type",
      ["e3", "hi", true],
    ],
    [
      "select_option",
      { ref: "e3", values: ["Hard"], why: "w" },
      "selectOption",
      ["e3", ["Hard"]],
    ],
    ["press_key", { key: "Escape", why: "w" }, "pressKey", ["Escape"]],
    ["go_to", { path: "/explore", why: "w" }, "goTo", ["/explore"]],
    ["go_back", { why: "w" }, "goBack", []],
    ["look", { seconds: 2, why: "w" }, "wait", [2]],
  ];
  it.each(browserCalls)(
    "runs %s on the browser",
    async (tool, input, method, args) => {
      const browser = fakeBrowser();
      const { client } = scripted(call(tool, input), finish());

      await runAgent({ client, browser, config: CONFIG });

      expect(browser[method]).toHaveBeenCalledWith(...args);
    },
  );

  it("sends input that fails validation back as an error, without acting", async () => {
    const browser = fakeBrowser();
    const { client, requests } = scripted(
      call("click", { why: "no ref" }),
      call("scroll", { why: "not a tool" }),
      finish(),
    );

    await runAgent({ client, browser, config: CONFIG });

    expect(browser.click).not.toHaveBeenCalled();
    expect(lastBlock(requests[1])).toMatchObject({
      is_error: true,
      content: JSON.stringify({
        INVALID_JSON: JSON.stringify({ why: "no ref" }),
        issues: ["ref: Required"],
      }),
    });
    expect(lastBlock(requests[2])).toMatchObject({
      is_error: true,
      content: "There is no tool called scroll.",
    });
  });

  it("reports an action that failed and shows the page again", async () => {
    const browser = fakeBrowser({
      click: jest.fn(async () => {
        throw new Error("e3 didn't respond within 10 seconds.\nCall log: ...");
      }),
    });
    const steps: { error?: string }[] = [];
    const { client, requests } = scripted(
      call("click", { ref: "e3", why: "start" }),
      finish("stuck", "The Start button doesn't work."),
    );

    const result = await runAgent({
      client,
      browser,
      config: CONFIG,
      onStep: (step) => steps.push(step),
    });

    const failed = lastBlock(requests[1]);
    expect(failed.is_error).toBe(true);
    expect(failed.content).toMatch(
      /^That didn't work: e3 didn't respond within 10 seconds\.\n\nPage: Python Basics/,
    );
    expect(steps[0].error).toBe("e3 didn't respond within 10 seconds.");
    expect(result.outcome).toBe("stuck");
  });

  it("refuses a ref that isn't on the current page, without waiting on the browser", async () => {
    const browser = fakeBrowser();
    const { client, requests } = scripted(
      call("click", { ref: "e99", why: "old ref" }),
      finish(),
    );

    await runAgent({ client, browser, config: CONFIG });

    expect(browser.click).not.toHaveBeenCalled();
    expect(lastBlock(requests[1])).toMatchObject({ is_error: true });
    expect(lastBlock(requests[1]).content).toMatch(
      /^That didn't work: There's no element e99 on the current page\./,
    );
  });

  it("keeps the problems Claude reports when it finishes", async () => {
    const { client } = scripted(
      call("finish", {
        outcome: "done",
        summary: "Finished.",
        problems: ["The quiz score didn't update."],
      }),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.problems).toEqual(["The quiz score didn't update."]);
  });

  it("stops at the step limit", async () => {
    const browser = fakeBrowser();
    const client: ClaudeClient = {
      send: async () => call("look", { why: "wait" }),
    };

    const result = await runAgent({
      client,
      browser,
      config: { ...CONFIG, maxSteps: 3 },
    });

    expect(result.outcome).toBe("step_limit");
    expect(browser.wait).toHaveBeenCalledTimes(3);
  });

  it("stops at the time limit", async () => {
    let clock = 0;
    const client: ClaudeClient = {
      send: async () => call("look", { why: "wait" }),
    };

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: { ...CONFIG, maxMinutes: 10 },
      now: () => (clock += 4 * 60_000),
    });

    expect(result.outcome).toBe("time_limit");
    expect(result.steps.length).toBeLessThan(CONFIG.maxSteps);
  });

  it("stops at the spending limit before acting again", async () => {
    const browser = fakeBrowser();
    const { client } = scripted(
      call("click", { ref: "e3", why: "start" }, { input_tokens: 800_000 }),
    );

    const result = await runAgent({ client, browser, config: CONFIG });

    expect(result.outcome).toBe("budget");
    expect(result.dollars).toBeCloseTo(3.2004);
    expect(browser.click).not.toHaveBeenCalled();
  });

  it("re-sends a turn whose tool input arrived broken", async () => {
    const { client, requests } = scripted(
      { kind: "unparseable_tool_input" },
      finish(),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("done");
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
  });

  it("re-sends a reply cut off at max_tokens with more room", async () => {
    const { client, requests } = scripted(
      reply([thinking], { stop_reason: "max_tokens" }),
      finish(),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("done");
    expect(requests.map((request) => request.max_tokens)).toEqual([
      16000, 32000,
    ]);
    // The cut-off reply isn't kept
    expect(requests[1].messages).toEqual(requests[0].messages);
  });

  it("keeps the two kinds of retry separate", async () => {
    const { client, requests } = scripted(
      { kind: "unparseable_tool_input" },
      reply([thinking], { stop_reason: "max_tokens" }),
      finish(),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("done");
    expect(requests.map((request) => request.max_tokens)).toEqual([
      16000, 16000, 32000,
    ]);
  });

  it("gives up after three unreadable tool inputs in a row", async () => {
    const unreadable: ClaudeReply = { kind: "unparseable_tool_input" };
    const { client, requests } = scripted(
      reply([thinking], { stop_reason: "max_tokens" }),
      unreadable,
      unreadable,
      unreadable,
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(requests).toHaveLength(4);
    expect(result).toMatchObject({
      outcome: "error",
      summary: "Claude's tool input couldn't be read three times in a row.",
    });
  });

  it("gives up when a reply is cut off twice", async () => {
    const cutOff = () => reply([thinking], { stop_reason: "max_tokens" });
    const { client } = scripted(cutOff(), cutOff());

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result).toMatchObject({
      outcome: "error",
      summary: "Claude's reply was cut off twice (max_tokens).",
    });
  });

  it("counts the tokens of attempts it threw away, per step and in total", async () => {
    const steps: StepRecord[] = [];
    const { client } = scripted(
      {
        kind: "unparseable_tool_input",
        extraUsage: [{ input_tokens: 1000, output_tokens: 50 }],
      },
      reply([thinking], {
        stop_reason: "max_tokens",
        usage: { input_tokens: 2000, output_tokens: 16000 },
      }),
      {
        ...finish(),
        extraUsage: [
          { input_tokens: 500, output_tokens: 5, cache_read_input_tokens: 300 },
        ],
      },
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
      onStep: (step) => steps.push(step),
    });

    // finish() itself used 100 input and 20 output tokens
    expect(result.usage).toEqual({
      input: 1000 + 2000 + 500 + 100,
      output: 50 + 16000 + 5 + 20,
      cacheWrite: 0,
      cacheRead: 300,
    });
    expect(steps[0].usage).toEqual(result.usage);
  });

  it("asks again when finish arrives malformed, instead of guessing the outcome", async () => {
    const { client, requests } = scripted(
      call("finish", { outcome: "done", summary: "Done.", problems: "None" }),
      call("finish", { outcome: "done", summary: "Done." }),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(lastBlock(requests[1])).toMatchObject({
      is_error: true,
      content: expect.stringContaining(
        '"issues":["problems: Expected array, received string"]',
      ),
    });
    expect(result).toMatchObject({ outcome: "done", summary: "Done." });
  });

  it("leaves an empty or thinking-only reply out of the conversation", async () => {
    const { client, requests } = scripted(
      reply([], { stop_reason: "end_turn" }),
      reply([thinking], { stop_reason: "end_turn" }),
      finish(),
    );

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("done");
    // The briefing, then a nudge after each reply that wasn't kept
    expect(requests[2].messages).toHaveLength(3);
    for (const request of requests) {
      expect(request.messages.every((message) => message.role === "user")).toBe(
        true,
      );
    }
  });

  it("ends with an error when the browser can't show the page", async () => {
    const view = jest
      .fn<Promise<PageView>, []>()
      .mockResolvedValueOnce({
        url: "http://localhost:3001/explore",
        title: "Explore",
        snapshot: SNAPSHOT,
        notes: [],
      })
      .mockRejectedValueOnce(new Error("Target page has been closed"));
    const { client } = scripted(call("click", { ref: "e3", why: "start" }));

    const result = await runAgent({
      client,
      browser: fakeBrowser({ view }),
      config: CONFIG,
    });

    expect(result).toMatchObject({
      outcome: "error",
      summary: "Target page has been closed",
    });
  });

  it("stops when it's told to, even partway through a request", async () => {
    const controller = new AbortController();
    const client: ClaudeClient = {
      send: async () => {
        controller.abort();
        throw new Error("Request was aborted.");
      },
    };

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
      signal: controller.signal,
    });

    expect(result).toMatchObject({
      outcome: "stopped",
      summary: "Stopped by hand.",
    });
  });

  it("stops when Claude declines to continue", async () => {
    const { client } = scripted(reply([], { stop_reason: "refusal" }));

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("error");
    expect(result.summary).toMatch(/declined/);
  });

  it("nudges Claude when it replies without a tool, then gives up", async () => {
    const text = () =>
      reply([{ type: "text", text: "I think I'm done." }], {
        stop_reason: "end_turn",
      });
    const { client, requests } = scripted(text(), text(), text());

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result.outcome).toBe("error");
    expect(result.summary).toBe("Claude stopped using the tools.");
    expect(lastBlock(requests[1])).toMatchObject({
      type: "text",
      text: expect.stringMatching(/^Use the tools to keep working/),
    });
  });

  it("stops when it's told to", async () => {
    const controller = new AbortController();
    const client: ClaudeClient = {
      send: async () => {
        controller.abort();
        return call("look", { why: "wait" });
      },
    };

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
      signal: controller.signal,
    });

    expect(result.outcome).toBe("stopped");
  });

  it("ends with the error when the API call fails", async () => {
    const client: ClaudeClient = {
      send: async () => {
        throw new Error("Overloaded\nmore detail");
      },
    };

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result).toMatchObject({ outcome: "error", summary: "Overloaded" });
  });
});

describe("AGENT_TOOLS", () => {
  it("stream their input and say what each needs", () => {
    for (const tool of AGENT_TOOLS) {
      expect(tool.eager_input_streaming).toBe(true);
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema.type).toBe("object");
    }
    const finishTool = AGENT_TOOLS.find((tool) => tool.name === "finish");
    expect(finishTool?.input_schema.required).toEqual(["outcome", "summary"]);
  });
});

describe("estimateDollars", () => {
  const million = { input: 1e6, output: 1e6, cacheWrite: 1e6, cacheRead: 1e6 };

  it("prices input, output, cache writes and cache reads", () => {
    expect(estimateDollars(million, "claude-opus-5-5")).toBeCloseTo(
      4 + 20 + 5 + 0.2,
    );
    expect(estimateDollars(million, "claude-sonnet-5-5")).toBeCloseTo(
      2 + 10 + 2.5 + 0.2,
    );
  });

  it("prices unknown models like Claude Opus 5.5", () => {
    expect(estimateDollars(million, "some-new-model")).toBeCloseTo(29.2);
  });
});

describe("formatSnapshot", () => {
  it("drops cursor hints", () => {
    expect(formatSnapshot('- link "Explore" [ref=e4] [cursor=pointer]:')).toBe(
      '- link "Explore" [ref=e4]:',
    );
  });

  it("keeps the top and bottom of a very long page and says what's left out", () => {
    const lines = Array.from(
      { length: 4000 },
      (_, n) => `- paragraph [ref=e${n}]: line ${n}`,
    );
    const snapshot = lines.join("\n");

    const formatted = formatSnapshot(snapshot);

    expect(snapshot.length).toBeGreaterThan(MAX_SNAPSHOT_CHARS);
    expect(formatted.length).toBeLessThan(MAX_SNAPSHOT_CHARS + 200);
    expect(formatted.startsWith(`${lines[0]}\n`)).toBe(true);
    expect(formatted.endsWith(`\n${lines[3999]}`)).toBe(true);
    // Whole lines on both sides of the note
    expect(formatted).toMatch(
      /: line \d+\n\([\d,]+ characters from the middle of this long page are left out\.\)\n- paragraph /,
    );
  });
});

describe("describeRef", () => {
  it.each([
    ['  - button "Start" [ref=e3] [cursor=pointer]', "e3", 'button "Start"'],
    ['  - link "Explore" [ref=e4] [cursor=pointer]:', "e4", 'link "Explore"'],
    [
      "    - 'heading \"Lesson 1: Intro\" [level=1] [ref=e7]'",
      "e7",
      'heading "Lesson 1: Intro"',
    ],
    ["- main [ref=e1]:", "e1", "main"],
  ])("reads %s as the element it is", (line, elementRef, expected) => {
    expect(describeRef(line, elementRef)).toBe(expected);
  });

  it("falls back to the ref when it isn't on the page", () => {
    expect(describeRef(SNAPSHOT, "e99")).toBe("e99");
  });
});
