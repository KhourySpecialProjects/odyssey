import { readdirSync, readFileSync } from "fs";
import path from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent, type AgentConfig } from "@/lib/demo-agent/agent";
import { actionError, resolveDemoUrl } from "@/lib/demo-agent/browser";
import { createClaudeClient } from "@/lib/demo-agent/claude";
import {
  createScriptedClient,
  findRef,
  latestPage,
} from "@/lib/demo-agent/scripted-client";

jest.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }
  class APIUserAbortError extends APIError {}
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  const stream = jest.fn();
  const Anthropic = jest.fn(() => ({ beta: { messages: { stream } } }));
  return {
    __esModule: true,
    default: Object.assign(Anthropic, {
      APIError,
      APIUserAbortError,
      AuthenticationError,
      PermissionDeniedError,
    }),
    mockStream: stream,
  };
});

const sdk = jest.requireMock("@anthropic-ai/sdk");
const mockStream: jest.Mock = sdk.mockStream;

const SNAPSHOT = [
  '- link "Explore" [ref=e4] [cursor=pointer]:',
  '- link "Python Basics" [ref=e12] [cursor=pointer]:',
  '- button "Start" [ref=e13]',
].join("\n");

const CONFIG: AgentConfig = {
  persona: {
    username: "student1",
    email: "student1@demo.odyssey.test",
    name: "Student 1",
    role: "Student",
  },
  goal: "Replay the script.",
  model: "claude-opus-5-5",
  effort: "medium",
  maxSteps: 10,
  maxMinutes: 15,
  maxDollars: 3,
};

function fakeBrowser() {
  return {
    view: jest.fn(async () => ({
      url: "http://localhost:3001/explore",
      title: "Explore",
      snapshot: SNAPSHOT,
      notes: [],
    })),
    click: jest.fn(async () => {}),
    type: jest.fn(async () => {}),
    selectOption: jest.fn(async () => {}),
    pressKey: jest.fn(async () => {}),
    goTo: jest.fn(async () => {}),
    goBack: jest.fn(async () => {}),
    wait: jest.fn(async () => {}),
  };
}

beforeEach(() => jest.clearAllMocks());

describe("the scripted client", () => {
  it("replays its steps, finding each element on the latest page", async () => {
    const browser = fakeBrowser();
    const client = createScriptedClient([
      { tool: "click", target: 'link "Python Basics"', input: { why: "open" } },
      { tool: "click", target: 'button "Start"', input: { why: "start" } },
      { tool: "finish", input: { outcome: "done", summary: "Replayed." } },
    ]);

    const result = await runAgent({ client, browser, config: CONFIG });

    expect(browser.click.mock.calls).toEqual([["e12"], ["e13"]]);
    expect(result).toMatchObject({
      outcome: "done",
      summary: "Replayed.",
      dollars: 0,
    });
  });

  it("fails loudly when a step's element isn't on the page", async () => {
    const client = createScriptedClient([
      { tool: "click", target: 'link "Nope"' },
    ]);

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result).toMatchObject({
      outcome: "error",
      summary: 'Script step 1: nothing on the page matches link "Nope"',
    });
  });

  it("finishes as stuck when the script runs out", async () => {
    const client = createScriptedClient([]);

    const result = await runAgent({
      client,
      browser: fakeBrowser(),
      config: CONFIG,
    });

    expect(result).toMatchObject({
      outcome: "stuck",
      summary: "The script ran out of steps.",
    });
  });

  it("reads the newest page from text or a tool result", () => {
    const text: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: [{ type: "text", text: '- link "First" [ref=e1]' }],
      },
    ];
    const toolResult: Anthropic.Beta.BetaMessageParam[] = [
      ...text,
      { role: "assistant", content: "ok" },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_1",
            content: '- link "Second" [ref=e2]',
          },
        ],
      },
    ];
    // An error result has no page, so the page before it still counts
    const error: Anthropic.Beta.BetaMessageParam[] = [
      ...toolResult,
      { role: "assistant", content: "ok" },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_2",
            is_error: true,
            content: "No such tool.",
          },
        ],
      },
    ];

    expect(latestPage(text)).toBe('- link "First" [ref=e1]');
    expect(latestPage(toolResult)).toBe('- link "Second" [ref=e2]');
    expect(latestPage(error)).toBe('- link "Second" [ref=e2]');
  });

  it("finds a ref by the element's snapshot text", () => {
    expect(findRef(SNAPSHOT, 'link "Python Basics"')).toBe("e12");
    expect(findRef(SNAPSHOT, 'button "Submit"')).toBeNull();
  });
});

describe("resolveDemoUrl", () => {
  const base = "http://localhost:3001";

  it.each([
    ["/explore", "http://localhost:3001/explore"],
    [
      "/d/python-basics/1?tab=quiz",
      "http://localhost:3001/d/python-basics/1?tab=quiz",
    ],
  ])("opens %s on the demo site", (url, expected) => {
    expect(resolveDemoUrl(base, url)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    // The URL parser drops tabs, which turns this into //evil.example
    "/\t/evil.example",
    "explore",
    "javascript:alert(1)",
  ])("refuses %s", (url) => {
    expect(() => resolveDemoUrl(base, url)).toThrow(/a path on the demo site/);
  });

  it.each([
    "/__nextjs_launch-editor?file=/etc/hosts",
    "/_next/static/chunks/main.js",
  ])("refuses Next's internal path %s", (url) => {
    expect(() => resolveDemoUrl(base, url)).toThrow(/internal paths/);
  });
});

describe("actionError", () => {
  it("explains a timeout in plain words", () => {
    const timeout = new Error("locator.click: Timeout 10000ms exceeded.");
    timeout.name = "TimeoutError";

    expect(actionError(timeout, "e12")).toBe(
      "e12 didn't respond within 10 seconds. It may be hidden, disabled or covered, or the page changed since the last look.",
    );
  });

  it("explains a page load the runner blocked", () => {
    const blocked = new Error(
      "page.goto: net::ERR_BLOCKED_BY_CLIENT at http://localhost:3001/api/auth/signout\nCall log: ...",
    );

    expect(actionError(blocked)).toBe("That page is off limits for agents.");
  });

  it("keeps the first line of other errors, without Playwright's prefix", () => {
    const error = new Error(
      "locator.fill: Error: Element is not an <input>, <textarea> or [contenteditable] element\nCall log:\n  - waiting for locator",
    );

    expect(actionError(error, "e4")).toBe(
      "Error: Element is not an <input>, <textarea> or [contenteditable] element",
    );
  });
});

describe("createClaudeClient", () => {
  const request = {
    model: "claude-opus-5-5",
    max_tokens: 16000,
    messages: [],
  } as unknown as Parameters<ReturnType<typeof createClaudeClient>["send"]>[0];
  const message = { id: "msg_1", content: [] };
  const spent = { input_tokens: 900, output_tokens: 40 };
  const failing = (error: Error) => ({
    finalMessage: async () => {
      throw error;
    },
    abort: jest.fn(),
    currentMessage: { usage: spent },
  });
  const succeeding = () => ({
    finalMessage: async () => message,
    abort: jest.fn(),
    currentMessage: message,
  });
  const noWait = { retryDelaysMs: [0, 0] };

  it("streams each turn with the context management beta", async () => {
    mockStream.mockReturnValue(succeeding());

    const reply = await createClaudeClient("sk-test").send(request);

    expect(sdk.default).toHaveBeenCalledWith({
      apiKey: "sk-test",
      maxRetries: 4,
    });
    expect(mockStream).toHaveBeenCalledWith(
      { ...request, betas: ["context-management-2025-06-27"] },
      { signal: expect.any(AbortSignal) },
    );
    expect(reply).toEqual({ kind: "message", message, extraUsage: [] });
  });

  it("gives each request its own signal, linked to the run's and then let go", async () => {
    mockStream.mockReturnValue(succeeding());
    const run = new AbortController();
    const add = jest.spyOn(run.signal, "addEventListener");
    const remove = jest.spyOn(run.signal, "removeEventListener");

    await createClaudeClient("sk-test").send(request, run.signal);

    const { signal } = mockStream.mock.calls[0][1];
    expect(signal).not.toBe(run.signal);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0][1]);
  });

  it("stops a stream whose tool input won't parse and counts what it used", async () => {
    const stream = failing(
      new Error("Unable to parse tool parameter JSON from model. JSON: {"),
    );
    mockStream.mockReturnValue(stream);

    const reply = await createClaudeClient("sk-test").send(request);

    expect(stream.abort).toHaveBeenCalled();
    expect(reply).toEqual({
      kind: "unparseable_tool_input",
      extraUsage: [spent],
    });
  });

  it("retries an error partway through a stream, counting the failed attempt", async () => {
    mockStream
      .mockReturnValueOnce(failing(new sdk.default.APIError("Overloaded")))
      .mockReturnValueOnce(succeeding());

    const reply = await createClaudeClient("sk-test", noWait).send(request);

    expect(mockStream).toHaveBeenCalledTimes(2);
    expect(reply).toEqual({ kind: "message", message, extraUsage: [spent] });
  });

  it("gives up after retrying twice", async () => {
    mockStream.mockReturnValue(failing(new sdk.default.APIError("Overloaded")));

    await expect(
      createClaudeClient("sk-test", noWait).send(request),
    ).rejects.toThrow("Overloaded");
    expect(mockStream).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry errors the SDK already retried, or a stop", async () => {
    mockStream.mockReturnValueOnce(
      failing(new sdk.default.APIError("Internal server error", 500)),
    );
    await expect(
      createClaudeClient("sk-test", noWait).send(request),
    ).rejects.toThrow("Internal server error");

    mockStream.mockReturnValueOnce(
      failing(new sdk.default.APIUserAbortError("Request was aborted.")),
    );
    await expect(
      createClaudeClient("sk-test", noWait).send(request),
    ).rejects.toThrow("Request was aborted.");
    expect(mockStream).toHaveBeenCalledTimes(2);
  });

  it("explains a rejected key or a refused request", async () => {
    mockStream.mockReturnValueOnce(
      failing(new sdk.default.AuthenticationError("invalid x-api-key", 401)),
    );
    await expect(createClaudeClient("sk-bad").send(request)).rejects.toThrow(
      "The Claude API rejected DEMO_AGENT_API_KEY.",
    );

    mockStream.mockReturnValueOnce(
      failing(
        new sdk.default.PermissionDeniedError("Workspace is archived", 403),
      ),
    );
    await expect(createClaudeClient("sk-test").send(request)).rejects.toThrow(
      "The Claude API refused the request: Workspace is archived",
    );
  });
});

describe("the agent files", () => {
  const dir = path.join(__dirname, "../../lib/demo-agent");
  const files = readdirSync(dir).filter((file) => file.endsWith(".ts"));

  // demo/agent.mjs runs them with Node's type stripping
  it.each(files)("%s can run with Node's type stripping", (file) => {
    const source = readFileSync(path.join(dir, file), "utf8");

    // Other agent files may only be imported for their types
    expect(source).not.toMatch(/^import (?!type )[^;]*from "\.\//m);
    expect(source).not.toMatch(/from "@\//);
    expect(source).not.toMatch(/^\s*(export )?(const )?enum |^\s*namespace /m);
  });
});
