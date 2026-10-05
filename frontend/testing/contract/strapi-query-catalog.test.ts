// ODY-635: runs the real request functions with fetch stubbed and records every Strapi request they build.
// Set ODY635_CATALOG_OUT=<file> to dump the catalog for scripts/ody-635/replay.mjs.
import fs from "fs";
import path from "path";
import {
  ALL_COLLECTIONS,
  CAPTURED,
  MODULE_PATHS,
  SKIPPED,
  type CapturedRequest,
  type Responder,
} from "./strapi-query-catalog";

process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://capture.invalid";
process.env.STRAPI_ACCESS_TOKEN = "capture-token";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ get: jest.fn(), getAll: () => [] })),
  headers: jest.fn(async () => new Headers()),
}));
jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(async () => ({
    email: "admin@example.invalid",
    id: 1,
    roles: ["System Admin", "Faculty", "Content Creator", "User"],
  })),
  isDevRoleOverrideEnabled: jest.fn(() => false),
}));
jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(async () => ({
    ok: true,
    user: {
      email: "admin@example.invalid",
      id: 1,
      documentId: "ody635admindoc",
      roles: ["System Admin", "Faculty", "Content Creator", "User"],
    },
  })),
}));

const EMPTY_LIST = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
};

const records: CapturedRequest[] = [];
let currentFn = "";
let responder: Responder | undefined;

// Captured functions that legitimately emit no Strapi request (add a reason for each).
const EXPECTED_NO_REQUESTS: Record<string, string> = {};

// Curated write flows (plan Q3 (a) plus 3 extras): each must record a write.
const CURATED_WRITES = [
  "authorized-user.updateUserInfo",
  "droplet.updateDroplet",
  "droplet.createDroplet",
  "droplet.duplicateDroplet",
  "droplet.publishDraftToOriginal",
  "droplet.favoriteDroplet",
  "enrollment.createEnrollment",
  "enrollment.updateViewedLessons",
  "feed.createFriendAnnouncement",
  "groups.createGroup",
  "groups.updateGroup",
  "groups.assignDropletDueDate",
  "highlights.createHighlight",
  "lesson.updateLesson",
  "lesson.addLesson",
  "lesson.duplicateLessonToDroplet",
  "notes.createNote",
  "playlist.updatePlaylist",
  "playlist.createPlaylist",
  "voyage.createVoyageWithNodes",
  "voyage-enrollment.claimNodeForUser",
];

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function stubFetch(input: unknown, init?: RequestInit) {
  const url = new URL(String(input));
  // Only Strapi calls are recorded; other hosts (PostHog, Graph) get an empty OK.
  if (url.host !== "capture.invalid") return Promise.resolve(okResponse({}));
  const method = (init?.method ?? "GET").toUpperCase();
  const apiPath = url.pathname.replace(/^\/api/, "");
  const query = url.search.replace(/^\?/, "");
  let body: unknown = init?.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // Non-JSON body: keep the raw string.
    }
  } else body = undefined;
  const entry: CapturedRequest = {
    fn: currentFn,
    kind: method === "GET" ? "read" : "write",
    method,
    path: apiPath,
    query,
    collection: apiPath.split("/")[1] ?? "",
    ...(body !== undefined && { body }),
  };
  const key = JSON.stringify([entry.fn, method, apiPath, query, body]);
  if (
    !records.some(
      (r) => JSON.stringify([r.fn, r.method, r.path, r.query, r.body]) === key,
    )
  ) {
    records.push(entry);
  }
  const payload =
    responder?.({ method, path: apiPath, query, body }) ??
    (method === "GET"
      ? EMPTY_LIST
      : { data: { id: 1, documentId: "ody635doc", attributes: {} } });
  return Promise.resolve(okResponse(payload));
}

async function load(key: string) {
  return import(MODULE_PATHS[key]);
}

describe("strapi query catalog (ODY-635)", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(() => {
    (global.fetch as jest.Mock).mockImplementation(stubFetch);
  });

  beforeAll(async () => {
    (global.fetch as jest.Mock).mockImplementation(stubFetch);
    for (const [key, calls] of Object.entries(CAPTURED)) {
      const mod = await load(key);
      for (const c of calls) {
        currentFn = `${key}.${c.fn}`;
        responder = c.respond;
        try {
          await c.run(mod as never);
        } catch {
          // The request was recorded before any throw; a later failure is irrelevant here.
        }
      }
    }

    // Document-id lookups (the identity mock in jest.setup skips them).
    const real = jest.requireActual("@/lib/strapi-document-id");
    responder = undefined;
    let n = 9000;
    for (const collection of ALL_COLLECTIONS) {
      currentFn = "strapi-document-id.resolveDocumentId";
      await real.resolveDocumentId(collection, n++).catch(() => {});
      currentFn = "strapi-document-id.resolveDocumentIds";
      await real.resolveDocumentIds(collection, [n++, n++]).catch(() => {});
    }
  }, 30_000);

  afterAll(() => {
    const out = process.env.ODY635_CATALOG_OUT;
    if (out) fs.writeFileSync(out, JSON.stringify(records, null, 2));
  });

  it("records at least one request for every captured function", () => {
    const recorded = new Set(records.map((r) => r.fn));
    const missing = Object.entries(CAPTURED)
      .flatMap(([key, calls]) => calls.map((c) => `${key}.${c.fn}`))
      .filter((fn) => !recorded.has(fn) && !EXPECTED_NO_REQUESTS[fn]);
    expect(missing).toEqual([]);
  });

  it("records a write for every curated write function", () => {
    const writers = new Set(
      records.filter((r) => r.kind === "write").map((r) => r.fn),
    );
    expect(CURATED_WRITES.filter((fn) => !writers.has(fn))).toEqual([]);
  });

  it("captures a sane number of requests", () => {
    expect(records.length).toBeGreaterThan(80);
    for (const r of records) {
      expect(r.method).toBeTruthy();
      expect(r.path).toMatch(/^\//);
    }
  });

  it("captures write bodies for the curated write flows", () => {
    const writeFns = new Set(
      records
        .filter((r) => r.kind === "write" && r.body !== undefined)
        .map((r) => r.fn),
    );
    expect(writeFns.size).toBeGreaterThanOrEqual(15);
    for (const r of records.filter(
      (r) => r.kind === "write" && r.method !== "DELETE",
    )) {
      expect(r.body).toEqual({ data: expect.any(Object) });
    }
  });

  it("accounts for every exported request function (captured or skipped with a reason)", async () => {
    const dir = path.join(__dirname, "../../lib/requests");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith("-populates.ts"))
      .map((f) => f.replace(/\.ts$/, ""));

    const missing: string[] = [];
    for (const key of files) {
      if (!MODULE_PATHS[key]) {
        missing.push(`${key} (module not listed in MODULE_PATHS)`);
        continue;
      }
      const mod = await load(key);
      const captured = new Set((CAPTURED[key] ?? []).map((c) => c.fn));
      const skipped = SKIPPED[key] ?? {};
      for (const [name, value] of Object.entries(mod)) {
        if (typeof value !== "function") continue;
        if (!captured.has(name) && !skipped[name])
          missing.push(`${key}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("lists no stale CAPTURED or SKIPPED names", async () => {
    const stale: string[] = [];
    for (const key of new Set([
      ...Object.keys(CAPTURED),
      ...Object.keys(SKIPPED),
    ])) {
      const mod = (await load(key)) as Record<string, unknown>;
      const names = [
        ...(CAPTURED[key] ?? []).map((c) => c.fn as string),
        ...Object.keys(SKIPPED[key] ?? {}),
      ];
      for (const name of names) {
        if (mod[name] === undefined) stale.push(`${key}.${name}`);
      }
    }
    expect(stale).toEqual([]);
  });
});
