/**
 * Coverage tests for lib/actions/auto-format-slides.ts
 *
 * Target: 75%+ statements
 *
 * Paths addressed:
 *   - Happy path: Haiku returns valid JSON array of operations
 *   - Malformed JSON: JSON.parse throws, action catches and returns error
 *   - Empty operations array: returns { operations: [] }
 *   - Haiku API 429 / 529 errors: mapped to user-friendly messages
 *   - Haiku API failure (non-status error): generic catch returns error
 *   - Rate limit exceeded: checkRateLimit returns { allowed: false }
 *   - Unauthenticated: getCurrentUser returns undefined
 *   - Missing API key: process.env.ANTHROPIC_API_KEY not set
 *   - Input validation filtering: invalid ops are stripped, valid ops returned
 *   - Two-column break operations
 *   - Large input (many blocks)
 *   - Markdown fences in response are cleaned before parsing
 */

import { autoFormatSlides } from "@/lib/actions/auto-format-slides";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { getCurrentUser } from "@/lib/auth/session";
import type { User } from "@/types";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// ─── module mocks ────────────────────────────────────────────────────────────

/**
 * The class must be defined inside the jest.mock factory because Jest hoists
 * jest.mock() calls above all variable/class declarations in the module scope.
 * Accessing an outer class from inside the factory would trigger a TDZ error.
 *
 * We also export it on the mock's `__MockAPIError` field so test code can
 * retrieve it via jest.requireMock() without any `as` casts.
 */
jest.mock("@anthropic-ai/sdk", () => {
  class AnthropicAPIErrorMock extends Error {
    status: number;
    constructor(
      status: number,
      _body: unknown,
      message: string,
      _headers: unknown,
    ) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }

  const baseMock = jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
  // Use Object.assign so TypeScript sees the extra properties on the combined
  // object. This avoids property-does-not-exist errors without `as any`.
  const AnthropicMock = Object.assign(baseMock, {
    // Attach APIError so production `instanceof Anthropic.APIError` works.
    APIError: AnthropicAPIErrorMock,
    // Expose under __MockAPIError so getMockAPIErrorClass() can retrieve it.
    __MockAPIError: AnthropicAPIErrorMock,
  });
  return { __esModule: true, default: AnthropicMock };
});

jest.mock("@/lib/import/rate-limiter", () => ({
  checkRateLimit: jest.fn(),
  formatRateLimitError: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

// ─── typed accessors (no `as` casts) ─────────────────────────────────────────

/**
 * Returns the mocked Anthropic constructor so tests can call
 * `.mockImplementation(...)` on it to control instance behaviour.
 *
 * We retrieve the mock via requireMock so we don't need an `import` that
 * TypeScript would check against the real module types.
 */
function getMockedAnthropicConstructor(): jest.MockedFunction<
  () => { messages: { create: jest.MockedFunction<() => Promise<unknown>> } }
> {
  return jest.requireMock("@anthropic-ai/sdk").default;
}

/**
 * Returns the MockAnthropicAPIError class that was attached to the mock
 * constructor inside the jest.mock factory. Using this class to throw errors
 * ensures production `instanceof Anthropic.APIError` checks pass.
 */
function getMockAPIErrorClass(): new (
  status: number,
  body: unknown,
  message: string,
  headers: unknown,
) => Error & { status: number } {
  return jest.requireMock("@anthropic-ai/sdk").default.__MockAPIError;
}

const mockedCheckRateLimit = jest.mocked(checkRateLimit);
const mockedFormatRateLimitError = jest.mocked(formatRateLimitError);
const mockedGetCurrentUser = jest.mocked(getCurrentUser);

// ─── fixtures ────────────────────────────────────────────────────────────────

const BLOCK_SUMMARIES = [
  { index: 0, type: "heading", textPreview: "Introduction", hasImage: false },
  {
    index: 1,
    type: "paragraph",
    textPreview: "Some content here.",
    hasImage: false,
  },
  {
    index: 2,
    type: "bulletListItem",
    textPreview: "Point one",
    hasImage: false,
  },
  {
    index: 3,
    type: "heading",
    textPreview: "Second Section",
    hasImage: false,
  },
  {
    index: 4,
    type: "paragraph",
    textPreview: "More content.",
    hasImage: false,
  },
];

function makeSdkResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("autoFormatSlides", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: "test-key",
    };

    // Default: authenticated user with no rate limit
    mockedGetCurrentUser.mockResolvedValue({
      email: "user@example.com",
      roles: [],
      isActive: true,
    } as User);
    mockedCheckRateLimit.mockReturnValue({ allowed: true });
    mockedFormatRateLimitError.mockReturnValue(
      "Rate limit reached. Try again in 60 minutes.",
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── happy path ──────────────────────────────────────────────────────────────

  it("returns parsed operations on happy path", async () => {
    const ops = [{ type: "insert-slide-break", afterBlockIndex: 2 }];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual({
        type: "insert-slide-break",
        afterBlockIndex: 2,
      });
    }
  });

  it("strips markdown fences before parsing", async () => {
    const ops = [{ type: "insert-slide-break", afterBlockIndex: 1 }];
    const fencedText = `\`\`\`json\n${JSON.stringify(ops)}\n\`\`\``;
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(makeSdkResponse(fencedText)),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toHaveLength(1);
    }
  });

  it("returns empty operations array when Haiku returns []", async () => {
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(makeSdkResponse("[]")),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toEqual([]);
    }
  });

  // ── two-column break operations ─────────────────────────────────────────────

  it("returns two-column-break operations when Haiku returns them", async () => {
    const ops = [
      {
        type: "insert-two-column-break",
        afterBlockIndex: 0,
        columnBreakAfterIndex: 2,
      },
    ];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toHaveLength(1);
      const op = result.operations[0];
      expect(op.type).toBe("insert-two-column-break");
      if (op.type === "insert-two-column-break") {
        expect(op.afterBlockIndex).toBe(0);
        expect(op.columnBreakAfterIndex).toBe(2);
      }
    }
  });

  // ── input validation filtering ───────────────────────────────────────────────

  it("filters out invalid operations (afterBlockIndex out of range)", async () => {
    const ops = [
      { type: "insert-slide-break", afterBlockIndex: 999 }, // out of range
      { type: "insert-slide-break", afterBlockIndex: 1 }, // valid
    ];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      // Only the valid op should survive
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toEqual({
        type: "insert-slide-break",
        afterBlockIndex: 1,
      });
    }
  });

  it("filters out slide-break at last block index (rule: not after last block)", async () => {
    // afterBlockIndex must be < blockSummaries.length - 1
    const lastIdx = BLOCK_SUMMARIES.length - 1; // 4
    const ops = [{ type: "insert-slide-break", afterBlockIndex: lastIdx }];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toEqual([]);
    }
  });

  it("filters out two-column-break with invalid columnBreakAfterIndex", async () => {
    // columnBreakAfterIndex must be > afterBlockIndex
    const ops = [
      {
        type: "insert-two-column-break",
        afterBlockIndex: 2,
        columnBreakAfterIndex: 1, // <= afterBlockIndex → invalid
      },
    ];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toEqual([]);
    }
  });

  it("filters out unknown operation types", async () => {
    const ops = [{ type: "unknown-op", afterBlockIndex: 1 }];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toEqual([]);
    }
  });

  // ── error paths ─────────────────────────────────────────────────────────────

  it("returns error when Haiku returns malformed JSON", async () => {
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse("not valid json {")),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe(
        "Failed to auto-format slides. Please try again.",
      );
    }
  });

  it("returns error when Haiku throws a non-API error", async () => {
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error("network failure")),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe(
        "Failed to auto-format slides. Please try again.",
      );
    }
  });

  it("returns rate-limited error on Anthropic 429", async () => {
    // Construct via getMockAPIErrorClass() so production `instanceof Anthropic.APIError` passes
    const APIError = getMockAPIErrorClass();
    const apiError = new APIError(
      429,
      { error: "rate limited" },
      "rate limited",
      null,
    );
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(apiError),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Rate limited — try again in a moment.");
    }
  });

  it("returns overloaded error on Anthropic 529", async () => {
    const APIError = getMockAPIErrorClass();
    const apiError = new APIError(
      529,
      { error: "overloaded" },
      "overloaded",
      null,
    );
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(apiError),
      },
    }));

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Service overloaded — try again later.");
    }
  });

  // ── auth / rate-limit guards ─────────────────────────────────────────────────

  it("returns error when user is not signed in", async () => {
    mockedGetCurrentUser.mockResolvedValue(undefined);

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("You must be signed in to use auto-format.");
    }
  });

  it("returns error when user has no email", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      roles: [],
      isActive: true,
    } as User); // no email

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("You must be signed in to use auto-format.");
    }
  });

  it("returns rate limit error when checkRateLimit returns { allowed: false }", async () => {
    mockedCheckRateLimit.mockReturnValue({
      allowed: false,
      retryAfterMs: 3600000,
    });
    mockedFormatRateLimitError.mockReturnValue(
      "Rate limit reached. Try again in 60 minutes.",
    );

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Rate limit reached. Try again in 60 minutes.");
    }
    // Verify Haiku was NOT called
    expect(getMockedAnthropicConstructor()).not.toHaveBeenCalled();
  });

  it("passes user email and roles to checkRateLimit", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      email: "faculty@example.com",
      roles: [AuthorizedUserRoleTitle.Faculty],
      isActive: true,
    } as User);
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(makeSdkResponse("[]")),
      },
    }));

    await autoFormatSlides(BLOCK_SUMMARIES);

    expect(mockedCheckRateLimit).toHaveBeenCalledWith(
      "faculty@example.com",
      [AuthorizedUserRoleTitle.Faculty],
      "auto-format",
    );
  });

  // ── missing API key ──────────────────────────────────────────────────────────

  it("returns error when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Anthropic API key not configured");
    }
  });

  // ── content-type handling ────────────────────────────────────────────────────

  it("handles non-text content type from Haiku (returns empty text)", async () => {
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            { type: "tool_use", id: "tool1", name: "some_tool", input: {} },
          ],
        }),
      },
    }));

    // text = "" → JSON.parse("") throws → caught → error
    const result = await autoFormatSlides(BLOCK_SUMMARIES);

    expect("error" in result).toBe(true);
  });

  // ── large input ──────────────────────────────────────────────────────────────

  it("handles large input without truncation", async () => {
    const largeBlocks = Array.from({ length: 50 }, (_, i) => ({
      index: i,
      type: "paragraph",
      textPreview: `Content block ${i}`,
      hasImage: false,
    }));
    const ops = [
      { type: "insert-slide-break", afterBlockIndex: 5 },
      { type: "insert-slide-break", afterBlockIndex: 15 },
      { type: "insert-slide-break", afterBlockIndex: 30 },
    ];
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: {
        create: jest
          .fn()
          .mockResolvedValue(makeSdkResponse(JSON.stringify(ops))),
      },
    }));

    const result = await autoFormatSlides(largeBlocks);

    expect("operations" in result).toBe(true);
    if ("operations" in result) {
      expect(result.operations).toHaveLength(3);
    }
  });

  it("passes all block summaries to Haiku SDK call", async () => {
    const messagesCreate = jest.fn().mockResolvedValue(makeSdkResponse("[]"));
    getMockedAnthropicConstructor().mockImplementation(() => ({
      messages: { create: messagesCreate },
    }));

    await autoFormatSlides(BLOCK_SUMMARIES);

    expect(messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
      }),
    );
    const callArg = messagesCreate.mock.calls[0][0];
    expect(callArg.messages[0].content).toContain(
      JSON.stringify(
        BLOCK_SUMMARIES.map((b) => ({
          index: b.index,
          type: b.type,
          text: b.textPreview,
        })),
        null,
        2,
      ),
    );
  });
});
