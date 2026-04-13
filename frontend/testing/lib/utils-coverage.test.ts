/**
 * Coverage tests for lib/utils.ts — focuses on branches not yet hit by
 * the existing testing/lib/utils.test.ts file.
 *
 * Uncovered line ranges (baseline):
 *   37-48   getDifficultyBadgeColor
 *   84      fetchAPI dev-mode cache+next guard
 *   114-115 fetchAPI non-ok: response.text()
 *   128     fetchAPI flattenResponse=false branch
 *   169     flattenAttributes nested data merge
 *   281-308 strapiJSONToTiptapJSON: list-item, image, list, heading, paragraph
 *   322     strapiJSONToTiptapJSON: empty paragraph
 *   332-347 strapiJSONToTiptapJSON: quote, code, default
 *   394-498 tiptapJSONToStrapiJSON: link, listItem, image, bullet/orderedList, heading, blockquote, codeBlock, default
 *   513     youtubeUrlToEmbeddedUrl: invalid URL
 *   525     embeddedUrlToYoutubeUrl: invalid URL
 *   558-648 convertBlockNoteToMarkdown
 */
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  getDifficultyBadgeColor,
  fetchAPI,
  flattenAttributes,
  strapiJSONToTiptapJSON,
  tiptapJSONToStrapiJSON,
  youtubeUrlToEmbeddedUrl,
  embeddedUrlToYoutubeUrl,
  isAuthorizedUserAdmin,
  stripHtmlTags,
  parseSandpackFiles,
  convertBlockNoteToMarkdown,
  getDueDateBadgeColor,
} from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";
import type { BlockNode } from "@/types/strapi";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeFetchErrorResponse,
} from "@/lib/testing/mock-helpers";

// ---------------------------------------------------------------------------
// getDifficultyBadgeColor
// ---------------------------------------------------------------------------

describe("getDifficultyBadgeColor", () => {
  it("returns green classes for beginner", () => {
    expect(getDifficultyBadgeColor("beginner")).toContain("green");
  });

  it("returns yellow classes for intermediate", () => {
    expect(getDifficultyBadgeColor("intermediate")).toContain("yellow");
  });

  it("returns red classes for advanced", () => {
    expect(getDifficultyBadgeColor("advanced")).toContain("red");
  });

  it("returns empty string for unknown difficulty", () => {
    expect(getDifficultyBadgeColor("expert")).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(getDifficultyBadgeColor("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getDueDateBadgeColor (branch coverage)
// ---------------------------------------------------------------------------

describe("getDueDateBadgeColor", () => {
  it("returns undefined when daysUntil < 0 and includeLate is false", () => {
    expect(getDueDateBadgeColor(-1, false)).toBeUndefined();
  });

  it("returns late badge when daysUntil < 0 and includeLate is true", () => {
    expect(getDueDateBadgeColor(-5, true)).toContain("red-400");
  });

  it("returns due-soon badge for 0 days", () => {
    expect(getDueDateBadgeColor(0, true)).toContain("red-300");
  });

  it("returns amber badge for 4-14 days", () => {
    expect(getDueDateBadgeColor(10, true)).toContain("amber");
  });

  it("returns emerald badge for 15+ days", () => {
    expect(getDueDateBadgeColor(20, true)).toContain("emerald");
  });
});

// ---------------------------------------------------------------------------
// fetchAPI — dev guard and error paths
// ---------------------------------------------------------------------------

describe("fetchAPI — uncovered branches", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://test.com";
    process.env.STRAPI_ACCESS_TOKEN = "test-token";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      writable: true,
      configurable: true,
    });
  });

  it("throws in dev when both cache and next options are supplied", async () => {
    await expect(
      fetchAPI("/test", {
        cache: "no-store",
        next: { revalidate: 60 },
      }),
    ).rejects.toThrow(/mutually exclusive/);
  });

  it("does NOT throw when only cache is supplied in dev", async () => {
    const mock = mockGlobalFetch();
    mock.mockResolvedValueOnce(
      makeFetchResponse({ data: { attributes: { x: 1 } } }),
    );
    await expect(
      fetchAPI("/test", { cache: "no-store" }),
    ).resolves.toBeDefined();
  });

  it("does NOT throw when only next is supplied in dev", async () => {
    const mock = mockGlobalFetch();
    mock.mockResolvedValueOnce(
      makeFetchResponse({ data: { attributes: { x: 1 } } }),
    );
    await expect(
      fetchAPI("/test", { next: { revalidate: 60 } }),
    ).resolves.toBeDefined();
  });

  it("returns raw (non-flattened) response when flattenResponse=false", async () => {
    const mock = mockGlobalFetch();
    const raw = { data: [{ id: 1, attributes: { name: "Test" } }] };
    mock.mockResolvedValueOnce(makeFetchResponse(raw));

    const result = await fetchAPI<typeof raw>("/test", {
      flattenResponse: false,
    });

    expect(result).toEqual(raw);
  });

  it("flattens response by default (flattenResponse omitted)", async () => {
    const mock = mockGlobalFetch();
    mock.mockResolvedValueOnce(
      makeFetchResponse({ data: { attributes: { name: "Flat" } } }),
    );

    const result = await fetchAPI<{ name: string }>("/test", {});

    expect(result).toEqual({ name: "Flat" });
  });

  it("throws on non-ok response with status in error message", async () => {
    const mock = mockGlobalFetch();
    mock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "Not Found" }, 404),
    );

    await expect(fetchAPI("/test", {})).rejects.toThrow("404");
  });
});

// ---------------------------------------------------------------------------
// flattenAttributes — edge cases
// ---------------------------------------------------------------------------

describe("flattenAttributes — uncovered paths", () => {
  it("returns null for null input", () => {
    expect(flattenAttributes(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(flattenAttributes(undefined)).toBeNull();
  });

  it("merges nested data object into flattened result", () => {
    const input = {
      id: 5,
      attributes: { title: "Hello" },
      data: { id: 6, attributes: { subtitle: "World" } },
    };
    const result = flattenAttributes(input);
    expect(result).toMatchObject({ id: 6, title: "Hello", subtitle: "World" });
  });

  it("handles attribute value that is a non-null object without data key", () => {
    const input = {
      id: 1,
      attributes: {
        meta: { count: 3 }, // object but no 'data' key → copied as-is
      },
    };
    const result = flattenAttributes(input);
    expect(result).toMatchObject({ id: 1, meta: { count: 3 } });
  });

  it("handles attribute value that is null (object check)", () => {
    const input = {
      id: 1,
      attributes: {
        nullable: null,
      },
    };
    const result = flattenAttributes(input);
    expect(result).toMatchObject({ id: 1, nullable: null });
  });
});

// ---------------------------------------------------------------------------
// strapiJSONToTiptapJSON — uncovered node types
// ---------------------------------------------------------------------------

describe("strapiJSONToTiptapJSON — list/image/heading/paragraph/quote/code/default", () => {
  it("converts list-item node", () => {
    const input = [
      {
        type: "list-item" as const,
        children: [{ type: "text" as const, text: "Item 1" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [expect.objectContaining({ type: "text", text: "Item 1" })],
        },
      ],
    });
  });

  it("converts image node", () => {
    const input = [
      {
        type: "image" as const,
        image: {
          url: "https://example.com/img.png",
          alternativeText: "alt text",
          name: "img.png",
          ext: ".png",
          hash: "",
          mime: "image/png",
          size: 100,
          width: 200,
          height: 100,
          caption: "",
          formats: {},
          provider: "local",
          provider_metadata: null,
          createdAt: "",
          updatedAt: "",
          previewUrl: null,
        },
        children: [],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({
      type: "image",
      attrs: {
        src: "https://example.com/img.png",
        alt: "alt text",
        title: "img.png",
      },
    });
  });

  it("converts ordered list node", () => {
    const input = [
      {
        type: "list" as const,
        format: "ordered" as const,
        children: [
          {
            type: "list-item" as const,
            children: [{ type: "text" as const, text: "one" }],
          },
        ],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({ type: "orderedList" });
  });

  it("converts unordered list node", () => {
    const input = [
      {
        type: "list" as const,
        format: "unordered" as const,
        children: [
          {
            type: "list-item" as const,
            children: [{ type: "text" as const, text: "bullet" }],
          },
        ],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({ type: "bulletList" });
  });

  it("converts heading node", () => {
    const input = [
      {
        type: "heading" as const,
        level: 2 as const,
        children: [{ type: "text" as const, text: "Section" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
  });

  it("converts empty paragraph (single empty text child) to bare paragraph", () => {
    const input = [
      {
        type: "paragraph" as const,
        children: [{ type: "text" as const, text: "" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toEqual({ type: "paragraph" });
  });

  it("converts non-empty paragraph", () => {
    const input = [
      {
        type: "paragraph" as const,
        children: [{ type: "text" as const, text: "Hello" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({ type: "paragraph" });
    expect((result[0] as JSONContent).content).toBeDefined();
  });

  it("converts quote node", () => {
    const input = [
      {
        type: "quote" as const,
        children: [{ type: "text" as const, text: "A quote" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({ type: "blockquote" });
  });

  it("converts code node with language", () => {
    const input = [
      {
        type: "code" as const,
        language: "typescript",
        children: [{ type: "text" as const, text: "const x = 1" }],
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "typescript" },
    });
  });

  it("converts text node with all formatting flags", () => {
    const input = [
      {
        type: "text" as const,
        text: "Formatted",
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        code: true,
      },
    ];
    const result = strapiJSONToTiptapJSON(input);
    const marks = (result[0] as JSONContent).marks!.map(
      (m: { type: string }) => m.type,
    );
    expect(marks).toContain("bold");
    expect(marks).toContain("italic");
    expect(marks).toContain("underline");
    expect(marks).toContain("strike");
    expect(marks).toContain("code");
  });

  it("returns empty object for unknown node type (default branch)", () => {
    // @ts-expect-error: deliberately passing an invalid type to exercise the default branch
    const input: BlockNode[] = [{ type: "unknown", children: [] }];
    const result = strapiJSONToTiptapJSON(input);
    expect(result[0]).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// tiptapJSONToStrapiJSON — uncovered node types
// ---------------------------------------------------------------------------

describe("tiptapJSONToStrapiJSON — uncovered node types", () => {
  it("converts link node (tiptap type=link)", () => {
    const input = [
      {
        type: "link",
        attrs: { href: "https://example.com" },
        content: [{ type: "text", text: "Click here" }],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "link",
      url: "https://example.com",
    });
  });

  it("converts listItem node", () => {
    const input = [
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "List content" }],
          },
        ],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "list-item",
    });
  });

  it("converts listItem with non-paragraph child (empty fallback)", () => {
    const input = [
      {
        type: "listItem",
        content: [{ type: "someOtherType", content: [] }],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({ type: "list-item", children: [] });
  });

  it("converts image node", () => {
    const input = [
      {
        type: "image",
        attrs: {
          src: "https://example.com/img.jpg",
          alt: "Alt text",
          title: "Title",
        },
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "image",
      image: expect.objectContaining({
        url: "https://example.com/img.jpg",
        alternativeText: "Alt text",
      }),
    });
  });

  it("converts bulletList node", () => {
    const input = [
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "item" }] },
            ],
          },
        ],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({ type: "list", format: "unordered" });
  });

  it("converts orderedList node", () => {
    const input = [
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "item" }] },
            ],
          },
        ],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({ type: "list", format: "ordered" });
  });

  it("converts heading node", () => {
    const input = [
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Heading text" }],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({ type: "heading", level: 3 });
  });

  it("converts empty paragraph to text children with empty text", () => {
    const input = [{ type: "paragraph" }];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "paragraph",
      children: [{ type: "text", text: "" }],
    });
  });

  it("converts paragraph with content", () => {
    const input = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Para text" }],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "paragraph",
      children: expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
      ]),
    });
  });

  it("converts blockquote node", () => {
    const input = [
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Quote" }],
          },
        ],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({ type: "quote" });
  });

  it("converts codeBlock node with language", () => {
    const input = [
      {
        type: "codeBlock",
        attrs: { language: "python" },
        content: [{ type: "text", text: "print('hello')" }],
      },
    ];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "code",
      language: "python",
    });
  });

  it("converts codeBlock with no content (uses empty text fallback)", () => {
    const input = [{ type: "codeBlock", attrs: { language: null } }];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toMatchObject({
      type: "code",
      language: "plaintext",
      children: [{ type: "text", text: "" }],
    });
  });

  it("returns text fallback for unknown node type (default branch)", () => {
    const input = [{ type: "unknownType" }];
    const result = tiptapJSONToStrapiJSON(input);
    expect(result[0]).toEqual({ type: "text", text: "" });
  });
});

// ---------------------------------------------------------------------------
// youtubeUrlToEmbeddedUrl / embeddedUrlToYoutubeUrl — invalid URL branches
// ---------------------------------------------------------------------------

describe("youtubeUrlToEmbeddedUrl", () => {
  it("returns fallback URL for invalid YouTube URL", () => {
    expect(youtubeUrlToEmbeddedUrl("https://vimeo.com/123")).toBe(
      "https://www.youtube.com/",
    );
  });

  it("handles youtu.be short links", () => {
    expect(youtubeUrlToEmbeddedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });
});

describe("embeddedUrlToYoutubeUrl", () => {
  it("returns fallback URL for non-embed URL", () => {
    expect(embeddedUrlToYoutubeUrl("https://vimeo.com/123")).toBe(
      "https://www.youtube.com/",
    );
  });

  it("returns fallback URL for empty string", () => {
    expect(embeddedUrlToYoutubeUrl("")).toBe("https://www.youtube.com/");
  });
});

// ---------------------------------------------------------------------------
// isAuthorizedUserAdmin — role matrix completeness
// ---------------------------------------------------------------------------

describe("isAuthorizedUserAdmin — role matrix", () => {
  it("returns true for SysAdmin", () => {
    expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.SysAdmin])).toBe(
      true,
    );
  });

  it("returns false for ContentCreator", () => {
    expect(
      isAuthorizedUserAdmin([AuthorizedUserRoleTitle.ContentCreator]),
    ).toBe(false);
  });

  it("returns false for ContentEditor", () => {
    expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.ContentEditor])).toBe(
      false,
    );
  });

  it("returns false for Faculty", () => {
    expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.Faculty])).toBe(
      false,
    );
  });

  it("returns false for User", () => {
    expect(isAuthorizedUserAdmin([AuthorizedUserRoleTitle.User])).toBe(false);
  });

  it("returns true when SysAdmin is mixed in with other roles", () => {
    expect(
      isAuthorizedUserAdmin([
        AuthorizedUserRoleTitle.User,
        AuthorizedUserRoleTitle.SysAdmin,
      ]),
    ).toBe(true);
  });

  it("returns false for undefined roles", () => {
    expect(isAuthorizedUserAdmin(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stripHtmlTags
// ---------------------------------------------------------------------------

describe("stripHtmlTags", () => {
  it("strips HTML tags", () => {
    expect(stripHtmlTags("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("replaces HTML entities", () => {
    expect(
      stripHtmlTags("AT&amp;T &lt;3 &gt;2 &quot;hi&quot; &#39;yo&#39;"),
    ).toBe("AT&T <3 >2 \"hi\" 'yo'");
  });

  it("replaces &nbsp; with space", () => {
    expect(stripHtmlTags("Hello&nbsp;World")).toBe("Hello World");
  });

  it("collapses multiple spaces", () => {
    expect(stripHtmlTags("Hello   World")).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("returns empty string for falsy input", () => {
    // @ts-expect-error: deliberately passing null to test the runtime guard
    expect(stripHtmlTags(null)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseSandpackFiles
// ---------------------------------------------------------------------------

describe("parseSandpackFiles", () => {
  it("returns parsed object for valid JSON", () => {
    const json = JSON.stringify({ "/index.js": "console.log('hi')" });
    expect(parseSandpackFiles(json)).toEqual({
      "/index.js": "console.log('hi')",
    });
  });

  it("returns empty object for invalid JSON", () => {
    expect(parseSandpackFiles("not-json")).toEqual({});
  });

  it("returns empty object for null", () => {
    expect(parseSandpackFiles(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(parseSandpackFiles(undefined)).toEqual({});
  });

  it("returns empty object when parsed value is not an object", () => {
    expect(parseSandpackFiles('"a string"')).toEqual({});
  });

  it("returns empty object for JSON null", () => {
    expect(parseSandpackFiles("null")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// convertBlockNoteToMarkdown
// ---------------------------------------------------------------------------

describe("convertBlockNoteToMarkdown", () => {
  it("converts heading block", () => {
    const blocks = [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ text: "My Heading", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("## My Heading");
  });

  it("uses # count matching level for h1/h3", () => {
    const h1 = [
      {
        type: "heading",
        props: { level: 1 },
        content: [{ text: "H1", styles: {} }],
      },
    ];
    const h3 = [
      {
        type: "heading",
        props: { level: 3 },
        content: [{ text: "H3", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(h1)).toBe("# H1");
    expect(convertBlockNoteToMarkdown(h3)).toBe("### H3");
  });

  it("converts paragraph block", () => {
    const blocks = [
      {
        type: "paragraph",
        props: {},
        content: [{ text: "Regular text", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("Regular text");
  });

  it("converts bulletListItem block", () => {
    const blocks = [
      {
        type: "bulletListItem",
        props: {},
        content: [{ text: "Bullet point", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("- Bullet point");
  });

  it("converts numberedListItem block", () => {
    const blocks = [
      {
        type: "numberedListItem",
        props: {},
        content: [{ text: "Numbered item", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("1. Numbered item");
  });

  it("converts image block with caption and url", () => {
    const blocks = [
      {
        type: "image",
        props: { url: "https://example.com/img.png", caption: "Caption" },
        content: [],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe(
      "![Caption](https://example.com/img.png)",
    );
  });

  it("skips image block with no url", () => {
    const blocks = [
      { type: "image", props: { url: "", caption: "" }, content: [] },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("");
  });

  it("converts video block with url and caption", () => {
    const blocks = [
      {
        type: "video",
        props: {
          url: "https://youtube.com/embed/abc",
          caption: "My video",
        },
        content: [],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("Video Link:");
    expect(result).toContain("My video");
  });

  it("converts video block with url and no caption", () => {
    const blocks = [
      {
        type: "video",
        props: { url: "https://youtube.com/embed/abc", caption: "" },
        content: [],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("Video Link:");
    expect(result).not.toContain("undefined");
  });

  it("skips video block with no url", () => {
    const blocks = [
      { type: "video", props: { url: "", caption: "" }, content: [] },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("");
  });

  it("converts callout block", () => {
    const blocks = [
      {
        type: "callout",
        props: { calloutType: "warning" },
        content: [{ text: "Watch out!", styles: {} }],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("Warning");
    expect(result).toContain("Watch out!");
  });

  it("converts quiz-true-false block", () => {
    const blocks = [
      {
        type: "quiz-true-false",
        props: { question: "Is the sky blue?", correctAnswer: true },
        content: [],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("Is the sky blue?");
    expect(result).toContain("True");
  });

  it("converts quiz-open-ended block", () => {
    const blocks = [
      {
        type: "quiz-open-ended",
        props: { question: "What is 2+2?", correctAnswer: "4" },
        content: [],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("What is 2+2?");
    expect(result).toContain("Answer:");
  });

  it("converts quiz-multiple-choice block", () => {
    const blocks = [
      {
        type: "quiz-multiple-choice",
        props: {
          question: "What is 2+2?",
          options: [
            { text: "3", isCorrect: false },
            { text: "4", isCorrect: true },
          ],
        },
        content: [],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("What is 2+2?");
    expect(result).toContain("Correct");
  });

  it("applies text styles: bold, italic, underline, strike, code", () => {
    const blocks = [
      {
        type: "paragraph",
        props: {},
        content: [
          { text: "bold", styles: { bold: true } },
          { text: "italic", styles: { italic: true } },
          { text: "under", styles: { underline: true } },
          { text: "strike", styles: { strike: true } },
          { text: "code", styles: { code: true } },
        ],
      },
    ];
    const result = convertBlockNoteToMarkdown(blocks);
    expect(result).toContain("**bold**");
    expect(result).toContain("*italic*");
    expect(result).toContain("<u>under</u>");
    expect(result).toContain("~~strike~~");
    expect(result).toContain("`code`");
  });

  it("returns empty string for unknown block type (default branch)", () => {
    const blocks = [
      { type: "unknownType", props: {}, content: [{ text: "x", styles: {} }] },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("");
  });

  it("filters out empty-string blocks and joins with double newline", () => {
    const blocks = [
      {
        type: "paragraph",
        props: {},
        content: [{ text: "First", styles: {} }],
      },
      { type: "unknownType", props: {}, content: [] },
      {
        type: "paragraph",
        props: {},
        content: [{ text: "Second", styles: {} }],
      },
    ];
    expect(convertBlockNoteToMarkdown(blocks)).toBe("First\n\nSecond");
  });
});
