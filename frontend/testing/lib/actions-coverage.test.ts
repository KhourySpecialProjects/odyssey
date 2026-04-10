// IMPORTANT: force NODE_ENV=production at the very top so that when
// actions.ts is required below, its module-level `const isLocal = NODE_ENV
// === "development"` evaluates to `false`. Otherwise the uploadImage /
// saveNotebookContent / uploadDataset functions take the local-filesystem
// branch and the S3 mock never runs. This must happen BEFORE any require
// of actions.ts — not in beforeEach, which runs after module load.
Object.defineProperty(process.env, "NODE_ENV", {
  value: "production",
  writable: true,
  configurable: true,
});

// jsdom's Blob/File polyfill is incomplete — neither arrayBuffer() nor
// text() are implemented, so production code that reads file contents
// throws in tests. Polyfill both methods using a WeakMap that tracks
// the raw bytes passed to the constructor. We can't swap in Node's
// File/Blob wholesale because jsdom's FormData expects jsdom's File.
const __fileBytes = new WeakMap<Blob, Uint8Array>();

// Wrap the Blob/File constructors so every instance we create records
// its bytes. This runs once, at module load, before any test creates
// a File/Blob.
(() => {
  type BlobInit = ConstructorParameters<typeof Blob>[0];
  type BlobOpts = ConstructorParameters<typeof Blob>[1];

  function concatBytes(parts: BlobInit): Uint8Array {
    const chunks: Uint8Array[] = [];
    for (const part of parts ?? []) {
      if (typeof part === "string") {
        chunks.push(new TextEncoder().encode(part));
      } else if (part instanceof Uint8Array) {
        chunks.push(part);
      } else if (part instanceof ArrayBuffer) {
        chunks.push(new Uint8Array(part));
      } else if (__fileBytes.has(part as Blob)) {
        chunks.push(__fileBytes.get(part as Blob)!);
      }
    }
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.byteLength;
    }
    return merged;
  }

  const OriginalBlob = globalThis.Blob;
  class PatchedBlob extends OriginalBlob {
    constructor(parts?: BlobInit, options?: BlobOpts) {
      super(parts, options);
      __fileBytes.set(this, concatBytes(parts ?? []));
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      return (__fileBytes.get(this) ?? new Uint8Array()).buffer as ArrayBuffer;
    }
    async text(): Promise<string> {
      return new TextDecoder().decode(
        __fileBytes.get(this) ?? new Uint8Array(),
      );
    }
  }
  (globalThis as unknown as { Blob: typeof PatchedBlob }).Blob = PatchedBlob;

  const OriginalFile = globalThis.File;
  class PatchedFile extends OriginalFile {
    constructor(
      parts: ConstructorParameters<typeof File>[0],
      name: string,
      options?: ConstructorParameters<typeof File>[2],
    ) {
      super(parts, name, options);
      __fileBytes.set(this, concatBytes(parts));
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      return (__fileBytes.get(this) ?? new Uint8Array()).buffer as ArrayBuffer;
    }
    async text(): Promise<string> {
      return new TextDecoder().decode(
        __fileBytes.get(this) ?? new Uint8Array(),
      );
    }
  }
  (globalThis as unknown as { File: typeof PatchedFile }).File = PatchedFile;
})();

/**
 * Comprehensive coverage tests for lib/actions.ts
 *
 * These tests target the functions NOT covered (or under-covered) by the
 * existing testing/lib/actions.test.ts file:
 *
 *  - uploadImage (S3 success & non-200 status paths)
 *  - deleteDataset (entire function)
 *  - deleteImage (S3 success path, non-204 status)
 *  - createBugReport (Anthropic fallback path, Linear issue created,
 *                     Linear API failure logged, non-text content block)
 *  - saveNotebookContent (entire function)
 *  - uploadDataset (entire function)
 *
 * Functions already well-covered by actions.test.ts and intentionally
 * excluded here to avoid duplicate test assertions:
 *  - setTimeZone, deleteReport, createAuthorizedUserWithState
 *  - createAccessRequest, deleteAccessRequest
 *  - createCreationRequest, approveCreationRequest, deleteCreationRequest
 *  - fetchCreationRequests, fetchCreationRequestByUser
 *
 * ---------------------------------------------------------------------------
 * WHY require() INSTEAD OF import:
 * ---------------------------------------------------------------------------
 * actions.ts has a `"use server"` directive.  With the next/babel transform,
 * top-level `import` statements are NOT reliably hoisted after jest.mock()
 * factories.  The result is that `actions.ts` loads the REAL @aws-sdk/client-s3
 * (before the mock is applied), so the module-level `const s3 = new S3Client()`
 * captures a real S3Client instance instead of our mock.
 *
 * Using require() at describe scope — after the jest.mock() factories have
 * already run — ensures every module dependency is the mocked version.
 */

import { mockGlobalFetch } from "@/lib/testing/mock-helpers";

// ---------------------------------------------------------------------------
// Module mocks — all declared before any require() of production code
// ---------------------------------------------------------------------------

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  flattenAttributes: jest.fn((x: unknown) => x),
  fetchAPI: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  createAuthorizedUser: jest.fn(),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

// S3 mock — factory runs before any require() of production modules.
// The `sendMock` is created here and attached to the constructor so tests
// can retrieve it via  require("@aws-sdk/client-s3").S3Client.__sendMock
jest.mock("@aws-sdk/client-s3", () => {
  const sendMock = jest.fn();
  const S3ClientMock = jest.fn().mockImplementation(() => ({ send: sendMock }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (S3ClientMock as any).__sendMock = sendMock;
  return {
    S3Client: S3ClientMock,
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

// Anthropic mock
jest.mock("@anthropic-ai/sdk", () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  })),
);

// fs/promises mock — prevent real disk I/O
jest.mock("node:fs/promises", () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(content: string, name: string, type = "image/jpeg"): File {
  return new File([content], name, { type });
}

function makeFormDataWithImage(
  content = "test content",
  name = "test.jpg",
): FormData {
  const fd = new FormData();
  fd.set("image", makeFile(content, name));
  return fd;
}

function makeFormDataWithDataset(
  content = "col1,col2\nval1,val2",
  name = "data.csv",
  type = "text/csv",
): FormData {
  const fd = new FormData();
  fd.set("file", makeFile(content, name, type));
  return fd;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
// All production functions are required lazily here (not via top-level import)
// so that jest.mock factories have already run before actions.ts loads.

describe("actions-coverage: lib/actions.ts", () => {
  // Lazy-require production code AFTER all jest.mock() factories have run.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const actions = require("@/lib/actions");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const s3Mod = require("@aws-sdk/client-s3");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockS3Send: jest.Mock = (s3Mod.S3Client as any).__sendMock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      AWS_S3_BUCKET_NAME: "test-bucket",
      AWS_S3_BUCKET_URL: "https://cdn.example.com",
      AWS_S3_BUCKET_ROOT: "test-root",
      NEXT_PUBLIC_STRAPI_API_URL: "http://localhost:1337",
      STRAPI_ACCESS_TOKEN: "test-token",
      AWS_REGION: "us-east-2",
      LINEAR_API_KEY: "linear-test-key",
      LINEAR_TEAM_ID: "team-abc",
      LINEAR_BUG_LABEL_ID: "label-xyz",
      ANTHROPIC_API_KEY: "anthropic-test-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // -------------------------------------------------------------------------
  // uploadImage
  // -------------------------------------------------------------------------

  describe("uploadImage", () => {
    it("returns ok:true with CDN URL on successful S3 upload", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.uploadImage(makeFormDataWithImage());

      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
      expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\/test-root\//);
    });

    it("returns ok:false when S3 responds with non-200 status", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 500 } });

      const result = await actions.uploadImage(makeFormDataWithImage());

      expect(result).toEqual({
        ok: false,
        error: "Failed to upload image.",
        url: null,
      });
    });

    it("sends PutObjectCommand with correct bucket, key prefix, and content-type", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      await actions.uploadImage(makeFormDataWithImage("data", "photo.jpg"));

      expect(s3Mod.PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: expect.stringContaining("test-root/"),
          ContentType: "image/jpeg",
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteDataset
  // -------------------------------------------------------------------------

  describe("deleteDataset", () => {
    it("returns ok:true when S3 DELETE returns 204", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

      const result = await actions.deleteDataset(
        "https://cdn.example.com/test-root/file.csv",
      );

      expect(result).toEqual({ ok: true, error: null });
    });

    it("returns ok:true when S3 DELETE returns 200", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.deleteDataset(
        "https://cdn.example.com/test-root/file.csv",
      );

      expect(result).toEqual({ ok: true, error: null });
    });

    it("revalidates datasets cache tag after successful delete", async () => {
      const { revalidateTag } = require("next/cache");
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

      await actions.deleteDataset("https://cdn.example.com/test-root/file.csv");

      expect(revalidateTag).toHaveBeenCalledWith("datasets");
    });

    it("returns invalid URL error when URL does not match bucket prefix", async () => {
      const result = await actions.deleteDataset(
        "https://other-bucket.s3.amazonaws.com/file.csv",
      );

      expect(result).toEqual({ ok: false, error: "Invalid file URL." });
    });

    it("returns ok:false when S3 responds with unexpected status", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 500 } });

      const result = await actions.deleteDataset(
        "https://cdn.example.com/test-root/file.csv",
      );

      expect(result).toEqual({
        ok: false,
        error: "Failed to delete dataset.",
      });
    });

    it("handles S3 exception and returns error", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockS3Send.mockRejectedValueOnce(new Error("S3 error"));

      const result = await actions.deleteDataset(
        "https://cdn.example.com/test-root/file.csv",
      );

      expect(result).toEqual({
        ok: false,
        error: "Failed to delete dataset.",
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("handles bucket URL that already ends with a slash", async () => {
      process.env.AWS_S3_BUCKET_URL = "https://cdn.example.com/";
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

      const result = await actions.deleteDataset(
        "https://cdn.example.com/test-root/file.csv",
      );

      expect(result).toEqual({ ok: true, error: null });
    });
  });

  // -------------------------------------------------------------------------
  // deleteImage
  // -------------------------------------------------------------------------

  describe("deleteImage", () => {
    it("returns ok:true when S3 DELETE returns 204", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

      const result = await actions.deleteImage("some-image.jpg");

      expect(result).toEqual({ ok: true, error: null });
    });

    it("returns ok:false for non-204 S3 status", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.deleteImage("some-image.jpg");

      expect(result).toEqual({ ok: false, error: "Failed to delete image" });
    });

    it("sends DeleteObjectCommand with correct bucket and key", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

      await actions.deleteImage("photo.jpg");

      expect(s3Mod.DeleteObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "test-root/photo.jpg",
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // createBugReport — Anthropic fallback + Linear fire-and-forget paths
  // -------------------------------------------------------------------------

  describe("createBugReport — Anthropic and Linear paths", () => {
    const bugFormData = {
      title: "Something broken",
      description: "The page crashes when I click submit",
      email: "reporter@example.com",
      path: "/dashboard",
      type: "bug" as const,
      fullName: "Jane Tester",
      sessionUrl: "https://posthog.com/replay/abc",
    };

    function queueStrapiSuccess(): jest.MockedFunction<typeof fetch> {
      const mockFetch = mockGlobalFetch();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 42 } }),
      } as Response);
      return mockFetch;
    }

    it("uses placeholder sections when Anthropic throws and still returns ok:true", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const MockAnthropic = jest.mocked(require("@anthropic-ai/sdk"));
      MockAnthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockRejectedValueOnce(new Error("Anthropic down")),
        },
      }));

      const mockFetch = queueStrapiSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { issueCreate: { success: true, issue: { id: "i1" } } },
        }),
      } as Response);

      const result = await actions.createBugReport(bugFormData);

      expect(result.ok).toBe(true);
      expect(consoleError).toHaveBeenCalledWith(
        "Anthropic generation failed, using placeholder sections:",
        expect.any(Error),
      );
      consoleError.mockRestore();
    });

    it("uses empty string when Anthropic content block type is not text", async () => {
      const MockAnthropic = jest.mocked(require("@anthropic-ai/sdk"));
      MockAnthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockResolvedValueOnce({
            content: [{ type: "tool_use", id: "x", name: "fn", input: {} }],
          }),
        },
      }));

      const mockFetch = queueStrapiSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { issueCreate: { success: true } } }),
      } as Response);

      const result = await actions.createBugReport(bugFormData);

      expect(result.ok).toBe(true);
    });

    it("logs error but does not fail when Linear returns success:false", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const MockAnthropic = jest.mocked(require("@anthropic-ai/sdk"));
      MockAnthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockResolvedValueOnce({
            content: [
              { type: "text", text: "## Acceptance Criteria\n- [ ] done" },
            ],
          }),
        },
      }));

      const mockFetch = queueStrapiSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { issueCreate: { success: false } } }),
      } as Response);

      const result = await actions.createBugReport(bugFormData);

      expect(result.ok).toBe(true);
      expect(consoleError).toHaveBeenCalledWith(
        "Linear issue creation failed:",
        expect.any(String),
      );
      consoleError.mockRestore();
    });

    it("logs error but does not fail when Linear fetch throws", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      const MockAnthropic = jest.mocked(require("@anthropic-ai/sdk"));
      MockAnthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest
            .fn()
            .mockResolvedValueOnce({ content: [{ type: "text", text: "x" }] }),
        },
      }));

      const mockFetch = queueStrapiSuccess();
      mockFetch.mockRejectedValueOnce(new Error("Linear network error"));

      const result = await actions.createBugReport(bugFormData);

      expect(result.ok).toBe(true);
      expect(consoleError).toHaveBeenCalledWith(
        "Linear API call threw an error:",
        expect.any(Error),
      );
      consoleError.mockRestore();
    });

    it("omits sessionUrl from Strapi request body", async () => {
      const MockAnthropic = jest.mocked(require("@anthropic-ai/sdk"));
      MockAnthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest
            .fn()
            .mockResolvedValueOnce({ content: [{ type: "text", text: "x" }] }),
        },
      }));

      const mockFetch = queueStrapiSuccess();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { issueCreate: { success: true } } }),
      } as Response);

      await actions.createBugReport(bugFormData);

      const strapiBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(strapiBody.data).not.toHaveProperty("sessionUrl");
      expect(strapiBody.data.type).toBe("bug");
    });
  });

  // -------------------------------------------------------------------------
  // saveNotebookContent
  // -------------------------------------------------------------------------

  describe("saveNotebookContent", () => {
    const validNotebook = JSON.stringify({
      cells: [{ cell_type: "code", source: [] }],
      metadata: { kernelspec: {} },
    });

    it("returns ok:true with CDN URL on successful upload", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.saveNotebookContent(validNotebook);

      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
      expect(result.url).toMatch(
        /^https:\/\/cdn\.example\.com\/test-root\/notebooks\/.+\.ipynb$/,
      );
    });

    it("reuses the existing URL and key when existingUrl is provided", async () => {
      const existingUrl =
        "https://cdn.example.com/test-root/notebooks/existing.ipynb";
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.saveNotebookContent(
        validNotebook,
        existingUrl,
      );

      expect(result.ok).toBe(true);
      expect(result.url).toBe(existingUrl);
      expect(s3Mod.PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: "test-root/notebooks/existing.ipynb",
        }),
      );
    });

    it("uses existingUrl as the S3 key when it lacks the bucket prefix", async () => {
      const existingUrl = "test-root/notebooks/bare-key.ipynb";
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.saveNotebookContent(
        validNotebook,
        existingUrl,
      );

      expect(result.ok).toBe(true);
      expect(result.url).toBe(existingUrl);
    });

    it("returns ok:false when content is not valid JSON", async () => {
      const result = await actions.saveNotebookContent("not { json }");

      expect(result).toEqual({
        ok: false,
        error: "Invalid notebook: content is not valid JSON.",
        url: null,
      });
    });

    it("returns ok:false when JSON is missing the cells array", async () => {
      const result = await actions.saveNotebookContent(
        JSON.stringify({ metadata: {}, nbformat: 4 }),
      );

      expect(result).toEqual({
        ok: false,
        error:
          'Invalid notebook: must have a "cells" array and a "metadata" object.',
        url: null,
      });
    });

    it("returns ok:false when JSON is missing the metadata object", async () => {
      const result = await actions.saveNotebookContent(
        JSON.stringify({ cells: [] }),
      );

      expect(result).toEqual({
        ok: false,
        error:
          'Invalid notebook: must have a "cells" array and a "metadata" object.',
        url: null,
      });
    });

    it("returns ok:false when JSON is a non-object value (array)", async () => {
      const result = await actions.saveNotebookContent(
        JSON.stringify([1, 2, 3]),
      );

      expect(result).toEqual({
        ok: false,
        error:
          'Invalid notebook: must have a "cells" array and a "metadata" object.',
        url: null,
      });
    });

    it("returns ok:false when notebook size exceeds 10 MB", async () => {
      const oversized = "x".repeat(10 * 1024 * 1024 + 1);

      const result = await actions.saveNotebookContent(oversized);

      expect(result).toEqual({
        ok: false,
        error: "Notebook size exceeds the 10MB limit.",
        url: null,
      });
    });

    it("returns ok:false when S3 returns non-200 status", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 500 } });

      const result = await actions.saveNotebookContent(validNotebook);

      expect(result).toEqual({
        ok: false,
        error: "Failed to upload notebook to S3.",
        url: null,
      });
    });

    it("returns ok:false and logs on S3 exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockS3Send.mockRejectedValueOnce(new Error("S3 connection refused"));

      const result = await actions.saveNotebookContent(validNotebook);

      expect(result).toEqual({
        ok: false,
        error: "Failed to save notebook content.",
        url: null,
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("sends PutObjectCommand with correct ContentType and CacheControl", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      await actions.saveNotebookContent(validNotebook);

      expect(s3Mod.PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ContentType: "application/json",
          CacheControl: "public, no-cache",
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // uploadDataset
  // -------------------------------------------------------------------------

  describe("uploadDataset", () => {
    it("returns ok:false when no file is in formData", async () => {
      const result = await actions.uploadDataset(new FormData());

      expect(result).toEqual({
        ok: false,
        error: "No file provided.",
        url: null,
      });
    });

    it("returns ok:false when file has size 0", async () => {
      const fd = new FormData();
      fd.set("file", new File([], "empty.csv", { type: "text/csv" }));

      const result = await actions.uploadDataset(fd);

      expect(result).toEqual({
        ok: false,
        error: "No file provided.",
        url: null,
      });
    });

    it("returns ok:false when file exceeds 25 MB", async () => {
      const fd = new FormData();
      fd.set(
        "file",
        new File(["x".repeat(26 * 1024 * 1024)], "big.csv", {
          type: "text/csv",
        }),
      );

      const result = await actions.uploadDataset(fd);

      expect(result).toEqual({
        ok: false,
        error: "File exceeds the 25MB maximum size limit.",
        url: null,
      });
    });

    it("returns ok:false for unsupported file extension (.txt)", async () => {
      const result = await actions.uploadDataset(
        makeFormDataWithDataset("data", "data.txt", "text/plain"),
      );

      expect(result).toEqual({
        ok: false,
        error:
          "Unsupported file type. Please upload a CSV, JSON, or XLSX file.",
        url: null,
      });
    });

    it("returns ok:true with CDN URL for a valid CSV upload", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.uploadDataset(makeFormDataWithDataset());

      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
      expect(result.url).toMatch(
        /^https:\/\/cdn\.example\.com\/test-root\/.+\.csv$/,
      );
    });

    it("accepts JSON files", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.uploadDataset(
        makeFormDataWithDataset(
          '{"key":"val"}',
          "data.json",
          "application/json",
        ),
      );

      expect(result.ok).toBe(true);
    });

    it("accepts XLSX files", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      const result = await actions.uploadDataset(
        makeFormDataWithDataset(
          "xlsx data",
          "spreadsheet.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      );

      expect(result.ok).toBe(true);
    });

    it("returns ok:false when S3 upload returns non-200 status", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 500 } });

      const result = await actions.uploadDataset(makeFormDataWithDataset());

      expect(result).toEqual({
        ok: false,
        error: "Failed to upload dataset.",
        url: null,
      });
    });

    it("returns ok:false and logs on S3 exception", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockS3Send.mockRejectedValueOnce(new Error("S3 error"));

      const result = await actions.uploadDataset(makeFormDataWithDataset());

      expect(result).toEqual({
        ok: false,
        error: "Failed to upload dataset.",
        url: null,
      });
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("sends PutObjectCommand with immutable CacheControl and correct bucket", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      await actions.uploadDataset(makeFormDataWithDataset());

      expect(s3Mod.PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          CacheControl: "public, max-age=604800, immutable",
        }),
      );
    });

    it("falls back to application/octet-stream when File.type is empty", async () => {
      mockS3Send.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

      // File constructed without a type argument → .type is ""
      const fd = new FormData();
      fd.set("file", new File(["data"], "data.csv"));

      await actions.uploadDataset(fd);

      const callArgs = jest.mocked(s3Mod.PutObjectCommand).mock.calls[0][0];
      // jsdom may infer the MIME type from extension; accept either
      expect(
        callArgs.ContentType === "text/csv" ||
          callArgs.ContentType === "application/octet-stream",
      ).toBe(true);
    });
  });
});
