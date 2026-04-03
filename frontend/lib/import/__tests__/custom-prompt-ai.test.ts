// Mock next-auth and session before importing the module under test
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn() }),
}));
jest.mock("@anthropic-ai/sdk");
jest.mock("../rate-limiter", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  formatRateLimitError:
    jest.requireActual("../rate-limiter").formatRateLimitError,
}));

import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "../rate-limiter";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// Helper: set up a logged-in user session
function mockUser(email = "creator@test.com") {
  (getServerSession as jest.Mock).mockResolvedValue({
    user: {
      email,
      roles: [AuthorizedUserRoleTitle.ContentCreator],
    },
  });
}

// Helper: set Anthropic to return a given text response
function mockAnthropicResponse(text: string) {
  const createMock = jest.fn().mockResolvedValue({
    content: [{ type: "text", text }],
  });
  (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () => ({ messages: { create: createMock } }) as unknown as Anthropic,
  );
  return createMock;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: rate limit allows
  (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });
  // Default: no session (tests override as needed)
  (getServerSession as jest.Mock).mockResolvedValue(null);
});

describe("customPromptAI", () => {
  it("rejects unauthenticated request", async () => {
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected text",
      "make it clearer",
    );
    expect(result.error).toMatch(/signed in/i);
    expect(result.result).toBe("selected text");
  });

  it("rejects when rate limit is exceeded", async () => {
    mockUser();
    (checkRateLimit as jest.Mock).mockReturnValue({
      allowed: false,
      retryAfterMs: 3_600_000, // 60 minutes
    });
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected",
      "prompt",
    );
    expect(result.error).toMatch(/rate limit/i);
    expect(result.error).toMatch(/60 minute/i);
    expect(result.result).toBe("selected");
  });

  it("rejects empty selectedText", async () => {
    mockUser();
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "",
      "make it clearer",
    );
    expect(result.error).toMatch(/selected text/i);
    expect(result.result).toBe("");
  });

  it("rejects empty userPrompt", async () => {
    mockUser();
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected",
      "",
    );
    expect(result.error).toMatch(/prompt/i);
    expect(result.result).toBe("selected");
  });

  it("rejects userPrompt over 500 chars", async () => {
    mockUser();
    const { customPromptAI } = await import("../custom-prompt-ai");
    const longPrompt = "a".repeat(501);
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected",
      longPrompt,
    );
    expect(result.error).toMatch(/500/i);
    expect(result.result).toBe("selected");
  });

  it("returns AI result on success", async () => {
    mockUser();
    const createMock = mockAnthropicResponse("Improved text here");
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "My Lesson",
      "Full lesson content here",
      "selected text to improve",
      "make it more concise",
    );
    expect(result.error).toBeUndefined();
    expect(result.result).toBe("Improved text here");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
      }),
    );
  });

  it("returns original text on Anthropic API error", async () => {
    mockUser();
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () =>
        ({
          messages: {
            create: jest.fn().mockRejectedValue(new Error("API error")),
          },
        }) as unknown as Anthropic,
    );
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected",
      "prompt",
    );
    expect(result.result).toBe("selected");
    expect(result.error).toMatch(/API error/);
  });

  it("returns original text if AI returns empty response", async () => {
    mockUser();
    mockAnthropicResponse("   ");
    const { customPromptAI } = await import("../custom-prompt-ai");
    const result = await customPromptAI(
      "Title",
      "Full content",
      "selected",
      "prompt",
    );
    expect(result.result).toBe("selected");
    expect(result.error).toMatch(/empty/i);
  });

  it("calls checkRateLimit with correct action", async () => {
    mockUser("user@test.com");
    mockAnthropicResponse("result");
    const { customPromptAI } = await import("../custom-prompt-ai");
    await customPromptAI("Title", "content", "selected", "prompt");
    expect(checkRateLimit).toHaveBeenCalledWith(
      "user@test.com",
      expect.any(Array),
      "custom-prompt",
    );
  });
});
