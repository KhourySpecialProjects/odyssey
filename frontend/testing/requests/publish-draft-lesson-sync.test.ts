/**
 * publishDraftToOriginal: syncing lessons in place (ODY-622)
 *
 * These tests run the real publishDraftToOriginal against a small in-memory
 * fake of Strapi instead of queueing canned responses. The fake holds lessons
 * and enrollments, applies every write it receives and logs each call in order,
 * so a test can assert what a student would see afterwards (which lessons still
 * exist, which ones they have viewed) and the order of the writes.
 *
 * The fake copies the Strapi behaviour this fix depends on:
 * - deleting a lesson drops it from every enrollment's viewedLessons
 * - creating a lesson needs a slug, then ignores it and generates one from the name
 * - updating a lesson keeps its slug unless regenerateSlug is truthy
 * - a lesson that would be left without content is rejected (lifecycles.ts)
 * - rewriting v1 blocks recreates the components, so they get new ids
 */

import { publishDraftToOriginal } from "@/lib/requests/droplet";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import { revalidateTag } from "next/cache";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeEmptyResponse,
  makeDroplet,
} from "@/lib/testing/mock-helpers";

import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
} from "@/lib/strapi-document-id";

// jest.resetAllMocks() also wipes the identity mock of @/lib/strapi-document-id
// installed in jest.setup.ts, so put it back after every reset.
function resetAllMocks() {
  jest.resetAllMocks();
  const identity = (ref: any): string =>
    ref && typeof ref === "object"
      ? ref.documentId ?? String(ref.id)
      : String(ref);
  jest
    .mocked(resolveDocumentId)
    .mockImplementation(async (_c, ref) => identity(ref));
  jest
    .mocked(resolveDocumentIds)
    .mockImplementation(async (_c, refs) => refs.map(identity));
  jest
    .mocked(strapiEntryUrl)
    .mockImplementation(
      async (collection, ref, query) =>
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${identity(ref)}${query ? `?${query}` : ""}`,
    );
}

// ─── module mocks ────────────────────────────────────────────────────────────

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentByUserAndDroplet: jest.fn(),
}));

// Only deleteLesson: publish must not import anything else from ./lesson.
jest.mock("@/lib/requests/lesson", () => ({
  deleteLesson: jest.fn(),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function getGetCurrentUser() {
  return jest.requireMock("@/lib/auth/session").getCurrentUser;
}
function getGetAuthorizedUserByEmail() {
  return jest.requireMock("@/lib/requests/authorized-user")
    .getAuthorizedUserByEmail;
}
function getMockedFetchAPI() {
  return jest.mocked(jest.requireMock("@/lib/utils").fetchAPI);
}
function getMockedDeleteLesson() {
  return jest.requireMock("@/lib/requests/lesson").deleteLesson;
}

// ─── ids ─────────────────────────────────────────────────────────────────────

const DRAFT = 1; // the [EDIT] draft
const LIVE = 2; // the published droplet it was cloned from

// The live lessons are 201-203 and the draft's clones are 101-103.
const INTRO = 201;
const QUIZ = 202;
const WRAP_UP = 203;

const STUDENT = 7001; // a student's enrollment in the live droplet
const AUTHOR_ENROLLMENT = 8001; // the author's own enrollment in the draft

const noteOf = (lessonId: number) => lessonId + 4800; // 5001-5003
const highlightOf = (lessonId: number) => lessonId + 5800; // 6001-6003

const DRAFT_DROPLET = makeDroplet({
  id: DRAFT,
  slug: "edit-my-droplet",
  name: "[EDIT] My Droplet",
  status: "draft",
  originalDropletId: LIVE,
  description: "A droplet",
  overview: "Overview",
  learningObjectives: [{ id: 1, objective: "Learn it" }],
});
const LIVE_DROPLET = makeDroplet({
  id: LIVE,
  slug: "my-droplet",
  name: "My Droplet",
});

// ─── lesson content ──────────────────────────────────────────────────────────

type Block = Record<string, unknown>;

/** v1 text block. `id` is the Strapi component id, which differs between a lesson and its clone. */
const genericBlock = (content: string, id: number): Block => ({
  id,
  __component: "droplets.generic",
  content,
});

/** v1 quiz block with ids at block, question and answer-option level (`base` .. `base + 3`). */
const quizBlock = (rightAnswer: string, base: number): Block => ({
  id: base,
  __component: "droplets.quiz",
  questions: [
    {
      id: base + 1,
      content: "<p>Pick one</p>",
      answerOptions: [
        { id: base + 2, isCorrect: true, content: rightAnswer },
        { id: base + 3, isCorrect: false, content: "Nope" },
      ],
    },
  ],
});

/** v2 (BlockNote) paragraph. BlockNote ids are strings, and v2 highlights anchor to them. */
const paragraph = (id: string, text: string): Block => ({
  id,
  type: "paragraph",
  content: [{ type: "text", text, styles: {} }],
  children: [],
});

// ─── the fake Strapi ─────────────────────────────────────────────────────────

type FakeLesson = {
  id: number;
  dropletId: number;
  name: string;
  slug: string;
  type: string;
  orderIndex: number;
  blocksVersion: "v1" | "v2";
  blocks: Block[];
  blocksV2: unknown;
  originalLessonId: number | null;
  noteIds: number[];
  highlightIds: number[];
};

type LessonSpec = Pick<FakeLesson, "id" | "dropletId" | "name"> &
  Partial<Omit<FakeLesson, "id" | "dropletId" | "name">>;

type FakeEnrollment = {
  id: number;
  droplet: number;
  viewedLessons: number[];
};

type RequestBody = { data: Record<string, unknown> };

type LoggedRequest = {
  type: "request";
  method: string;
  path: string;
  body?: RequestBody;
};
type LoggedDelete = {
  type: "deleteLesson";
  lessonId: number;
  revalidate: boolean | undefined;
  /** Which droplet the lesson belonged to when it was deleted, or null if it didn't exist. */
  dropletId: number | null;
};
type LoggedCall = LoggedRequest | LoggedDelete;

/**
 * How deleteLesson reports a failed delete. "refused" is Strapi answering with an
 * error: { ok: false, error, data }. "caught" is its catch path, which resolves
 * { error } with no ok flag at all.
 */
type DeleteFailure = "refused" | "caught";

const EMPTY_LESSON = "Lesson must have either blocks or blocksV2 content";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const strapiError = (status: number, message: string) =>
  makeFetchResponse(
    {
      data: null,
      error: { status, name: "ApplicationError", message, details: {} },
    },
    status,
  );

class FakeStrapi {
  readonly lessons = new Map<number, FakeLesson>();
  readonly enrollments: FakeEnrollment[] = [];
  /** Every request and every lesson delete, in the order publish made them. */
  readonly log: LoggedCall[] = [];

  private failures: {
    method: string;
    path: RegExp;
    status: number;
    message: string;
  }[] = [];
  private failingDeletes = new Map<
    number,
    { message: string; how: DeleteFailure }
  >();
  private nextLessonId = 900;
  private nextComponentId = 9000;

  // ── seeding ────────────────────────────────────────────────────────────────

  addLesson(spec: LessonSpec): FakeLesson {
    const lesson: FakeLesson = {
      slug: this.uniqueSlug(spec.name),
      type: "general",
      orderIndex: 0,
      blocksVersion: "v1",
      blocks: [],
      blocksV2: null,
      originalLessonId: null,
      noteIds: [],
      highlightIds: [],
      ...spec,
    };
    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  lesson(id: number): FakeLesson {
    const lesson = this.lessons.get(id);
    if (!lesson) throw new Error(`No lesson ${id} in the fake`);
    return lesson;
  }

  draftLesson(name: string): FakeLesson {
    const lesson = this.lessonsOf(DRAFT).find((l) => l.name === name);
    if (!lesson) throw new Error(`No draft lesson named "${name}"`);
    return lesson;
  }

  enrollment(id: number): FakeEnrollment {
    const enrollment = this.enrollments.find((e) => e.id === id);
    if (!enrollment) throw new Error(`No enrollment ${id} in the fake`);
    return enrollment;
  }

  // ── failure injection ──────────────────────────────────────────────────────

  /** Answers every matching request with a Strapi error until clearFailures(). */
  failRequest(method: string, path: RegExp, message: string, status = 500) {
    this.failures.push({ method, path, status, message });
  }

  /** deleteLesson fails for this lesson, in one of the two shapes the real one returns. */
  failDelete(
    lessonId: number,
    message: string,
    how: DeleteFailure = "refused",
  ) {
    this.failingDeletes.set(lessonId, { message, how });
  }

  clearFailures() {
    this.failures = [];
    this.failingDeletes.clear();
  }

  // ── what a test asserts on ─────────────────────────────────────────────────

  lessonsOf(dropletId: number): FakeLesson[] {
    return [...this.lessons.values()]
      .filter((lesson) => lesson.dropletId === dropletId)
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  }

  /** The lessons a student has viewed that still exist in the live droplet. */
  progress(enrollmentId: number): number[] {
    const liveIds = new Set(this.lessonsOf(LIVE).map((lesson) => lesson.id));
    return this.enrollment(enrollmentId)
      .viewedLessons.filter((id) => liveIds.has(id))
      .sort((a, b) => a - b);
  }

  requests(method: string, path: RegExp): LoggedRequest[] {
    return this.log.filter(
      (call): call is LoggedRequest =>
        call.type === "request" &&
        call.method === method &&
        path.test(call.path),
    );
  }

  /** Every call that changes something: any non-GET request and any lesson delete. */
  writes(): LoggedCall[] {
    return this.log.filter(
      (call) => call.type === "deleteLesson" || call.method !== "GET",
    );
  }

  /** Lesson PUTs and POSTs, the writes that must all finish before anything is deleted. */
  lessonWrites(): LoggedRequest[] {
    return this.log.filter(
      (call): call is LoggedRequest =>
        call.type === "request" &&
        call.method !== "GET" &&
        call.path.startsWith("/api/lessons"),
    );
  }

  /** Deletes of lessons that belonged to the live droplet. The draft's own lessons are not counted. */
  liveDeletes(): LoggedDelete[] {
    return this.log.filter(
      (call): call is LoggedDelete =>
        call.type === "deleteLesson" && call.dropletId === LIVE,
    );
  }

  draftWasDeleted(): boolean {
    return (
      this.requests("DELETE", new RegExp(`^/api/droplets/${DRAFT}$`)).length > 0
    );
  }

  // ── wiring ─────────────────────────────────────────────────────────────────

  /** Routes fetchAPI, global.fetch and deleteLesson to this fake. */
  install(): void {
    getMockedFetchAPI().mockImplementation(
      async (path: string, options?: { urlParams?: any }) =>
        this.readDroplet(path, options?.urlParams?.filters?.id?.$eq),
    );
    mockGlobalFetch().mockImplementation(async (input, init) => {
      const url = String(input);
      // The base URL env var can be undefined in tests, so match on the path only
      const path = url.slice(url.indexOf("/api/"));
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as RequestBody)
          : undefined;
      return this.handle(init?.method ?? "GET", path, body);
    });
    getMockedDeleteLesson().mockImplementation(
      async (lessonId: number, revalidate?: boolean) =>
        this.deleteLesson(lessonId, revalidate),
    );
  }

  // ── fetchAPI: GET /droplets/:id with its lessons ───────────────────────────

  // getDropletById reads the list endpoint with an id filter (Strapi v5 single
  // routes need a documentId), so the fake answers with a one-item list.
  private readDroplet(path: string, id: number): unknown {
    if (path !== "/droplets" || (id !== DRAFT && id !== LIVE)) {
      throw new Error(
        `FakeStrapi: unexpected fetchAPI path ${path} (id ${id})`,
      );
    }
    return clone([
      {
        ...(id === DRAFT ? DRAFT_DROPLET : LIVE_DROPLET),
        lessons: this.lessonsOf(id).map((lesson) => this.attributes(lesson)),
      },
    ]);
  }

  /** A lesson as fetchAPI returns it for fields: ["*"] with blocks populated. */
  private attributes(lesson: FakeLesson) {
    return {
      id: lesson.id,
      name: lesson.name,
      slug: lesson.slug,
      type: lesson.type,
      orderIndex: lesson.orderIndex,
      blocksVersion: lesson.blocksVersion,
      blocks: lesson.blocks,
      blocksV2: lesson.blocksV2,
      originalLessonId: lesson.originalLessonId,
      // Scalar fields come back too. A payload built by spreading would leak them.
      lockedAt: lesson.dropletId === DRAFT ? "2026-02-01T10:00:00.000Z" : null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      publishedAt: "2026-01-01T00:00:00.000Z",
    };
  }

  // ── global.fetch ───────────────────────────────────────────────────────────

  private async handle(method: string, path: string, body?: RequestBody) {
    this.log.push({ type: "request", method, path, body });

    const failure = this.failures.find(
      (f) => f.method === method && f.path.test(path),
    );
    if (failure) return strapiError(failure.status, failure.message);

    const data = body?.data ?? {};
    const idIn = (pattern: RegExp) => Number(pattern.exec(path)?.[1]);

    if (method === "GET") {
      const dropletId = idIn(
        /^\/api\/enrollments\?filters\[droplet\]\[id\]\[\$eq\]=(\d+)/,
      );
      if (dropletId) {
        return makeFetchResponse({
          data: this.enrollments
            .filter((e) => e.droplet === dropletId)
            .map((e) => ({ id: e.id })),
        });
      }
    }

    if (method === "PUT") {
      if (/^\/api\/lessons\/\d+$/.test(path)) {
        return this.putLesson(idIn(/(\d+)$/), data);
      }
      if (/^\/api\/droplets\/\d+$/.test(path)) {
        return makeFetchResponse({
          data: {
            id: idIn(/(\d+)$/),
            attributes: { status: data.status },
          },
        });
      }
      if (/^\/api\/enrollments\/\d+$/.test(path)) {
        this.enrollment(idIn(/(\d+)$/)).droplet = Number(data.droplet); // relation values are documentIds; the fake uses String(id)
        return makeFetchResponse({ data: {} });
      }
    }

    if (method === "POST" && path === "/api/lessons") {
      return this.postLesson(data);
    }

    // Strapi v5 answers every core DELETE with an empty 204
    if (method === "DELETE" && /^\/api\/droplets\/\d+$/.test(path)) {
      return makeEmptyResponse(204);
    }

    if (method === "DELETE" && /^\/api\/lessons\/\d+$/.test(path)) {
      this.removeLesson(idIn(/(\d+)$/));
      return makeEmptyResponse(204);
    }

    throw new Error(`FakeStrapi: unhandled ${method} ${path}`);
  }

  private putLesson(id: number, data: Record<string, unknown>) {
    const lesson = this.lessons.get(id);
    if (!lesson) return strapiError(404, "Not Found");
    if (this.leavesWithoutContent(lesson, data)) {
      return strapiError(400, EMPTY_LESSON);
    }

    if (typeof data.name === "string") lesson.name = data.name;
    if (typeof data.slug === "string") lesson.slug = data.slug;
    if (typeof data.type === "string") lesson.type = data.type;
    if (typeof data.orderIndex === "number")
      lesson.orderIndex = data.orderIndex;
    if (data.blocksVersion === "v1" || data.blocksVersion === "v2") {
      lesson.blocksVersion = data.blocksVersion;
    }
    if ("blocks" in data) {
      lesson.blocks = this.recreateComponents(data.blocks as Block[]);
    }
    if ("blocksV2" in data) lesson.blocksV2 = data.blocksV2;
    if ("originalLessonId" in data) {
      lesson.originalLessonId = data.originalLessonId as number | null;
    }
    // Sending a relation replaces it: null or an empty value detaches everything.
    if ("notes" in data) {
      lesson.noteIds = Array.isArray(data.notes)
        ? (data.notes as number[])
        : [];
    }
    if ("highlights" in data) {
      lesson.highlightIds = Array.isArray(data.highlights)
        ? (data.highlights as number[])
        : [];
    }
    // lifecycles.ts beforeUpdate: the slug only changes when regenerateSlug is truthy.
    if (data.regenerateSlug) lesson.slug = this.uniqueSlug(lesson.name, id);

    return makeFetchResponse({
      data: { id, attributes: this.attributes(lesson) },
    });
  }

  private postLesson(data: Record<string, unknown>) {
    // slug is a required uid, so Strapi rejects a create that doesn't send one...
    if (typeof data.slug !== "string" || data.slug === "") {
      return strapiError(
        400,
        "slug must be a `string` type, but the final value was: `undefined`.",
      );
    }
    // ...and lifecycles.ts beforeCreate then requires content.
    if (!data.blocks && !data.blocksV2) return strapiError(400, EMPTY_LESSON);

    const name = data.name as string;
    const lesson = this.addLesson({
      id: this.nextLessonId++,
      dropletId: Number((data.droplets as string[])[0]),
      name,
      // beforeCreate always overwrites the posted slug with one generated from the name
      slug: this.uniqueSlug(name),
      type: (data.type as string | undefined) ?? "general",
      orderIndex: data.orderIndex as number,
      blocksVersion: (data.blocksVersion as "v1" | "v2" | undefined) ?? "v1",
      blocks: this.recreateComponents((data.blocks as Block[]) ?? []),
      blocksV2: data.blocksV2 ?? null,
      originalLessonId: (data.originalLessonId as number | undefined) ?? null,
    });
    return makeFetchResponse({
      data: { id: lesson.id, attributes: this.attributes(lesson) },
    });
  }

  /** lifecycles.ts beforeUpdate: an update may not leave a lesson with neither blocks nor blocksV2. */
  private leavesWithoutContent(
    lesson: FakeLesson,
    data: Record<string, unknown>,
  ): boolean {
    if (!("blocks" in data) && !("blocksV2" in data)) return false;
    const blocks = "blocks" in data ? data.blocks : lesson.blocks;
    const blocksV2 = "blocksV2" in data ? data.blocksV2 : lesson.blocksV2;
    const hasBlocks = Array.isArray(blocks)
      ? blocks.length > 0
      : Boolean(blocks);
    return !hasBlocks && !blocksV2;
  }

  /** Writing v1 blocks recreates the dynamic-zone components, so every one gets a new id. */
  private recreateComponents(blocks: Block[]): Block[] {
    return blocks.map((block) => ({
      ...block,
      id: this.nextComponentId++,
      ...(Array.isArray(block.questions)
        ? {
            questions: (block.questions as Block[]).map((question) => ({
              ...question,
              id: this.nextComponentId++,
              ...(Array.isArray(question.answerOptions)
                ? {
                    answerOptions: (question.answerOptions as Block[]).map(
                      (answer) => ({ ...answer, id: this.nextComponentId++ }),
                    ),
                  }
                : {}),
            })),
          }
        : {}),
    }));
  }

  /** slugify(name), or slugify(name)-N when it is taken, like generateSlug. */
  private uniqueSlug(name: string, ignoreId?: number): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const taken = new Set(
      [...this.lessons.values()]
        .filter((lesson) => lesson.id !== ignoreId)
        .map((lesson) => lesson.slug),
    );
    if (!taken.has(base)) return base;
    let n = 1;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  // ── deleteLesson ───────────────────────────────────────────────────────────

  private deleteLesson(lessonId: number, revalidate?: boolean) {
    const lesson = this.lessons.get(lessonId);
    this.log.push({
      type: "deleteLesson",
      lessonId,
      revalidate,
      dropletId: lesson?.dropletId ?? null,
    });

    const failure = this.failingDeletes.get(lessonId);
    if (failure) {
      return failure.how === "caught"
        ? { error: failure.message }
        : { ok: false, error: failure.message, data: null };
    }
    if (!lesson) return { ok: false, error: "Not Found", data: null };

    this.removeLesson(lessonId);
    return { ok: true, error: null, data: null };
  }

  private removeLesson(lessonId: number) {
    this.lessons.delete(lessonId);
    // Strapi deletes the join rows along with the lesson
    for (const enrollment of this.enrollments) {
      enrollment.viewedLessons = enrollment.viewedLessons.filter(
        (id) => id !== lessonId,
      );
    }
  }
}

// ─── scenario ────────────────────────────────────────────────────────────────

/** Three lessons shaped like Strapi's response. `base` shifts every row id and component id. */
function standardLessons(dropletId: number, base: number): LessonSpec[] {
  return [
    {
      id: base + 1,
      dropletId,
      name: "Intro",
      type: "general",
      orderIndex: 0,
      blocksVersion: "v1",
      blocks: [genericBlock("Welcome", base + 10)],
    },
    {
      id: base + 2,
      dropletId,
      name: "Quiz",
      type: "activity",
      orderIndex: 1,
      blocksVersion: "v1",
      blocks: [quizBlock("Four", base + 20)],
    },
    {
      id: base + 3,
      dropletId,
      name: "Wrap up",
      type: "general",
      orderIndex: 2,
      blocksVersion: "v2",
      blocks: [],
      blocksV2: [paragraph("bn-wrap", "Done")],
    },
  ];
}

/**
 * The published droplet: lessons 201-203, each with a student note and a highlight,
 * and one student who has viewed the first two.
 */
function seedLiveDroplet(fake: FakeStrapi) {
  for (const spec of standardLessons(LIVE, 200)) {
    const lesson = fake.addLesson(spec);
    lesson.noteIds = [noteOf(lesson.id)];
    lesson.highlightIds = [highlightOf(lesson.id)];
  }
  fake.enrollments.push({
    id: STUDENT,
    droplet: LIVE,
    viewedLessons: [INTRO, QUIZ],
  });
}

/**
 * The [EDIT] draft as duplicateDroplet builds it: the same content with fresh row and
 * component ids. With `lineage`, each clone records which live lesson it came from.
 */
function seedDraft(fake: FakeStrapi, { lineage = true } = {}) {
  standardLessons(DRAFT, 100).forEach((spec, i) => {
    fake.addLesson({ ...spec, originalLessonId: lineage ? INTRO + i : null });
  });
}

/** One short label per call, so a test can compare the order of the writes. */
function label(call: LoggedCall): string {
  if (call.type === "deleteLesson") {
    return call.dropletId === LIVE
      ? "delete live lesson"
      : "delete draft lesson";
  }
  if (call.path.startsWith("/api/enrollments?"))
    return "read draft enrollments";
  if (call.path.startsWith("/api/enrollments/")) return "move enrollment";
  if (call.path.startsWith("/api/lessons")) {
    return call.method === "PUT" ? "update lesson" : "create lesson";
  }
  return `${call.method} ${call.path}`;
}

/** Drops consecutive repeats: three lesson updates in a row become one "update lesson". */
const phases = (calls: LoggedCall[]) =>
  calls.map(label).filter((step, i, steps) => step !== steps[i - 1]);

const LESSON_PUT = /^\/api\/lessons\/\d+$/;
const LESSON_POST = /^\/api\/lessons$/;
const ENROLLMENT_PUT = /^\/api\/enrollments\/\d+$/;

// ─── tests ───────────────────────────────────────────────────────────────────

describe("publishDraftToOriginal: lesson sync", () => {
  let fake: FakeStrapi;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    resetAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    fake = new FakeStrapi();
    fake.install();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Publishing a draft whose only change is the quiz lesson's content must change nothing else. */
  async function expectOnlyTheQuizContentIsUpdated() {
    const progressBefore = fake.progress(STUDENT);

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result).toEqual({ ok: true, error: null, slug: "my-droplet" });

    // The ticket's assertion: viewedLessons ∩ the droplet's lessons is identical
    expect(progressBefore).toEqual([INTRO, QUIZ]);
    expect(fake.progress(STUDENT)).toEqual(progressBefore);

    // No lesson was deleted or created, so ids and slugs are the live ones
    expect(fake.liveDeletes()).toEqual([]);
    expect(fake.requests("POST", LESSON_POST)).toHaveLength(0);
    expect(fake.lessonsOf(LIVE).map(({ id, slug }) => ({ id, slug }))).toEqual([
      { id: INTRO, slug: "intro" },
      { id: QUIZ, slug: "quiz" },
      { id: WRAP_UP, slug: "wrap-up" },
    ]);

    // Exactly one lesson write, carrying only the content that changed
    const puts = fake.requests("PUT", LESSON_PUT);
    expect(puts).toHaveLength(1);
    expect(puts[0].path).toBe(`/api/lessons/${QUIZ}`);
    expect(Object.keys(puts[0].body?.data ?? {})).toEqual(["blocks"]);
    expect(JSON.stringify(fake.lesson(QUIZ).blocks)).toContain("Five");

    // Student notes and highlights are still attached to every lesson
    expect(fake.lessonsOf(LIVE).map((l) => l.noteIds)).toEqual([
      [noteOf(INTRO)],
      [noteOf(QUIZ)],
      [noteOf(WRAP_UP)],
    ]);
    expect(fake.lessonsOf(LIVE).map((l) => l.highlightIds)).toEqual([
      [highlightOf(INTRO)],
      [highlightOf(QUIZ)],
      [highlightOf(WRAP_UP)],
    ]);
  }

  it("keeps progress, ids, slugs, notes and highlights when one lesson's content changed (ticket test)", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    // The author changes one answer in the quiz lesson and nothing else
    fake.draftLesson("Quiz").blocks = [quizBlock("Five", 120)];

    await expectOnlyTheQuizContentIsUpdated();
  });

  it("does the same for a legacy draft with no lineage, matching lessons by name", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake, { lineage: false });
    fake.draftLesson("Quiz").blocks = [quizBlock("Five", 120)];

    await expectOnlyTheQuizContentIsUpdated();
  });

  it("syncs a reorder, an insert and a removal, deleting only after every update and create", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    // The manual-verification edit: move Wrap up to the top, insert a lesson in the
    // middle, delete Quiz and rename Intro.
    const intro = fake.draftLesson("Intro");
    const wrapUp = fake.draftLesson("Wrap up");
    fake.lessons.delete(fake.draftLesson("Quiz").id);
    wrapUp.orderIndex = 0;
    intro.orderIndex = 2;
    intro.name = "Intro v2";
    fake.addLesson({
      id: 104,
      dropletId: DRAFT,
      name: "Fresh",
      type: "activity",
      orderIndex: 1,
      blocksVersion: "v2",
      blocksV2: [paragraph("bn-fresh", "Brand new")],
    });

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(true);

    // Kept lessons keep their id and slug, even when renamed. The new lesson's slug
    // comes from its name ("fresh-1" here, as the draft's own "Fresh" holds "fresh"),
    // not from the placeholder that was posted.
    expect(
      fake.lessonsOf(LIVE).map(({ id, name, slug, orderIndex }) => ({
        id,
        name,
        slug,
        orderIndex,
      })),
    ).toEqual([
      { id: WRAP_UP, name: "Wrap up", slug: "wrap-up", orderIndex: 0 },
      {
        id: expect.any(Number),
        name: "Fresh",
        slug: expect.stringMatching(/^fresh(-\d+)?$/),
        orderIndex: 1,
      },
      { id: INTRO, name: "Intro v2", slug: "intro", orderIndex: 2 },
    ]);

    // Only the removed lesson is deleted, without the per-delete revalidation
    expect(
      fake.liveDeletes().map(({ lessonId, revalidate }) => ({
        lessonId,
        revalidate,
      })),
    ).toEqual([{ lessonId: QUIZ, revalidate: false }]);

    // Every lesson PUT and POST happens before the first live delete
    const log = fake.log;
    const lastWrite = Math.max(
      ...fake.lessonWrites().map((call) => log.indexOf(call)),
    );
    const firstDelete = log.indexOf(fake.liveDeletes()[0]);
    expect(fake.lessonWrites()).toHaveLength(3);
    expect(lastWrite).toBeGreaterThan(-1);
    expect(firstDelete).toBeGreaterThan(lastWrite);

    // The student keeps what they viewed, minus the lesson that was removed
    expect(fake.progress(STUDENT)).toEqual([INTRO]);

    // A rename plus a move rewrites no v1 content, so the components (and the
    // v1 highlights anchored to their ids) survive
    expect(fake.lesson(INTRO).blocks[0].id).toBe(210);

    // The new lesson is created with its full content, a placeholder slug and
    // the live droplet, and without notes or lineage
    const [post] = fake.requests("POST", LESSON_POST);
    expect(post.body?.data).toEqual({
      name: "Fresh",
      type: "activity",
      orderIndex: 1,
      blocksVersion: "v2",
      blocksV2: [paragraph("bn-fresh", "Brand new")],
      slug: expect.any(String),
      droplets: [String(LIVE)], // a documentId (the fake uses String(id))
    });
  });

  it("publishes a lesson removal when Strapi answers every DELETE with an empty 204 (v5)", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    fake.enrollments.push({
      id: AUTHOR_ENROLLMENT,
      droplet: DRAFT,
      viewedLessons: [101],
    });
    fake.lessons.delete(fake.draftLesson("Quiz").id);
    // Use the real deleteLesson so DELETE /api/lessons/:id reaches the fake
    getMockedDeleteLesson().mockImplementation(
      jest.requireActual("@/lib/requests/lesson").deleteLesson,
    );

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(true);
    expect(fake.lessons.has(QUIZ)).toBe(false);
    expect(fake.requests("DELETE", /^\/api\/lessons\/202$/)).toHaveLength(1);
    expect(fake.progress(STUDENT)).toEqual([INTRO]);
    expect(fake.requests("PUT", ENROLLMENT_PUT)).not.toEqual([]);
    expect(fake.enrollment(AUTHOR_ENROLLMENT).droplet).toBe(LIVE);
    expect(fake.draftWasDeleted()).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
    // updateDroplet, publish's finally and deepDeleteDroplet each revalidate this tag once
    expect(
      jest
        .mocked(revalidateTag)
        .mock.calls.filter(([tag]) => tag === CACHE_TAGS.allUserDashboards),
    ).toHaveLength(3);
  });

  it("writes no lesson and deletes no lesson when the draft is unchanged", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result).toEqual({ ok: true, error: null, slug: "my-droplet" });
    expect(fake.lessonWrites()).toEqual([]);
    expect(fake.liveDeletes()).toEqual([]);
    expect(fake.progress(STUDENT)).toEqual([INTRO, QUIZ]);
    // The droplet itself is still updated and the draft is still removed
    expect(
      fake.requests("PUT", new RegExp(`^/api/droplets/${LIVE}$`)),
    ).toHaveLength(1);
    expect(fake.draftWasDeleted()).toBe(true);
  });

  it.each<[string, number]>([
    ["answers HTTP 500", 500],
    ["answers 200 with an error in the body", 200],
  ])(
    "stops at a failed lesson update, deletes nothing and keeps the draft and its enrollments when Strapi %s",
    async (_how, status) => {
      seedLiveDroplet(fake);
      seedDraft(fake);
      fake.enrollments.push({
        id: AUTHOR_ENROLLMENT,
        droplet: DRAFT,
        viewedLessons: [101],
      });
      // Intro is renamed (its PUT fails), a lesson is added and Wrap up is removed
      fake.draftLesson("Intro").name = "Intro v2";
      fake.addLesson({
        id: 104,
        dropletId: DRAFT,
        name: "Fresh",
        orderIndex: 2,
        blocks: [genericBlock("New", 140)],
      });
      fake.lessons.delete(fake.draftLesson("Wrap up").id);
      fake.failRequest(
        "PUT",
        new RegExp(`^/api/lessons/${INTRO}$`),
        "Something broke",
        status,
      );

      const result = await publishDraftToOriginal(DRAFT, LIVE);

      expect(result).toEqual({
        ok: false,
        error:
          'Publishing stopped partway (lesson "Intro v2": Something broke). No lessons were removed. Publish again to finish.',
        slug: null,
      });
      // Nothing after the failure ran
      expect(fake.requests("POST", LESSON_POST)).toHaveLength(0);
      expect(fake.liveDeletes()).toEqual([]);
      expect(fake.requests("PUT", ENROLLMENT_PUT)).toEqual([]);
      expect(fake.draftWasDeleted()).toBe(false);
      expect(fake.enrollment(AUTHOR_ENROLLMENT).droplet).toBe(DRAFT);
      expect(fake.lessonsOf(DRAFT)).toHaveLength(3);
      // Students lost nothing
      expect(fake.progress(STUDENT)).toEqual([INTRO, QUIZ]);
      expect(fake.lessonsOf(LIVE).map((l) => l.id)).toEqual([
        INTRO,
        QUIZ,
        WRAP_UP,
      ]);
      // The finally block still ran: deepDeleteDroplet never did, so only it can have flushed this
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.lesson);
    },
  );

  it("stops at a failed lesson create, deletes nothing and keeps the draft and its enrollments", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    fake.enrollments.push({
      id: AUTHOR_ENROLLMENT,
      droplet: DRAFT,
      viewedLessons: [101],
    });
    // Intro is renamed (its PUT works), a lesson is added (its POST fails) and Wrap up is removed
    fake.draftLesson("Intro").name = "Intro v2";
    fake.addLesson({
      id: 104,
      dropletId: DRAFT,
      name: "Fresh",
      orderIndex: 2,
      blocks: [genericBlock("New", 140)],
    });
    fake.lessons.delete(fake.draftLesson("Wrap up").id);
    fake.failRequest("POST", LESSON_POST, "Something broke");

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result).toEqual({
      ok: false,
      error:
        'Publishing stopped partway (lesson "Fresh": Something broke). No lessons were removed. Publish again to finish.',
      slug: null,
    });
    // The update before the failure is kept: content may be mixed, but nothing is lost
    expect(fake.lesson(INTRO).name).toBe("Intro v2");
    expect(fake.lessonsOf(LIVE).map((l) => l.id)).toEqual([
      INTRO,
      QUIZ,
      WRAP_UP,
    ]);
    expect(fake.liveDeletes()).toEqual([]);
    expect(fake.progress(STUDENT)).toEqual([INTRO, QUIZ]);
    // The draft and its enrollment are kept, so publishing again can finish
    expect(fake.draftWasDeleted()).toBe(false);
    expect(fake.requests("PUT", ENROLLMENT_PUT)).toEqual([]);
    expect(fake.enrollment(AUTHOR_ENROLLMENT).droplet).toBe(DRAFT);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.lesson);
  });

  it("changes no lesson when updating the droplet fails", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    fake.draftLesson("Quiz").blocks = [quizBlock("Five", 120)];
    fake.lessons.delete(fake.draftLesson("Wrap up").id);
    fake.failRequest(
      "PUT",
      new RegExp(`^/api/droplets/${LIVE}$`),
      "Invalid relations",
      400,
    );

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid relations");
    expect(fake.lessonWrites()).toEqual([]);
    expect(fake.liveDeletes()).toEqual([]);
    expect(fake.draftWasDeleted()).toBe(false);
    expect(fake.lessonsOf(LIVE).map((l) => l.id)).toEqual([
      INTRO,
      QUIZ,
      WRAP_UP,
    ]);
  });

  it.each<[string, DeleteFailure]>([
    ["resolves { ok: false }", "refused"],
    ["resolves only an error, with no ok flag (its catch path)", "caught"],
  ])(
    "tries every delete when one fails, then reports the failure and keeps the draft, when deleteLesson %s",
    async (_how, how) => {
      seedLiveDroplet(fake);
      seedDraft(fake);
      fake.enrollments.push({
        id: AUTHOR_ENROLLMENT,
        droplet: DRAFT,
        viewedLessons: [],
      });
      // Quiz and Wrap up are removed in the draft; deleting Quiz (the first) is refused
      fake.lessons.delete(fake.draftLesson("Quiz").id);
      fake.lessons.delete(fake.draftLesson("Wrap up").id);
      fake.failDelete(QUIZ, "Cannot delete lesson", how);

      const result = await publishDraftToOriginal(DRAFT, LIVE);

      expect(result.ok).toBe(false);
      expect(result.slug).toBeNull();
      expect(result.error).toContain('"Quiz"');
      expect(result.error).toContain("Cannot delete lesson");
      expect(result.error).toContain("Publish again");
      expect(result.error).not.toContain("Wrap up");
      // The failed delete did not stop the next one
      expect(fake.liveDeletes().map((d) => d.lessonId)).toEqual([
        QUIZ,
        WRAP_UP,
      ]);
      expect(fake.lessons.has(WRAP_UP)).toBe(false);
      expect(fake.lessons.has(QUIZ)).toBe(true);
      // The draft and its enrollment are kept
      expect(fake.draftWasDeleted()).toBe(false);
      expect(fake.requests("PUT", ENROLLMENT_PUT)).toEqual([]);
      expect(fake.enrollment(AUTHOR_ENROLLMENT).droplet).toBe(DRAFT);
    },
  );

  it("rejects a draft with no lessons over a live droplet that has some, before any write", async () => {
    seedLiveDroplet(fake);
    // No draft lessons: the author deleted them all

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result).toEqual({
      ok: false,
      error:
        "This draft has no lessons. Add at least one lesson before publishing.",
      slug: null,
    });
    expect(fake.writes()).toEqual([]);
    expect(fake.lessonsOf(LIVE)).toHaveLength(3);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a lesson that would be left empty, before any write", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    // Another valid change that must not be written either
    fake.draftLesson("Intro").name = "Intro v2";
    // The author emptied the quiz lesson
    fake.draftLesson("Quiz").blocks = [];

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result).toEqual({
      ok: false,
      error:
        'Lesson "Quiz" has no content. Add content or delete the lesson before publishing.',
      slug: null,
    });
    expect(fake.writes()).toEqual([]);
    expect(fake.lesson(INTRO).name).toBe("Intro");
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("reads the draft and the original fresh, with the same lesson populate", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(true);
    type FetchAPICall = [
      path: string,
      options: {
        cache?: string;
        next?: unknown;
        urlParams: { populate: { lessons: unknown } };
      },
    ];
    const reads = getMockedFetchAPI().mock.calls as FetchAPICall[];
    // The first draft read is publish's own; deepDeleteDroplet reads the draft again afterwards
    const readOf = (id: number) =>
      reads.filter(
        ([path, options]) =>
          path === "/droplets" &&
          (options.urlParams as any).filters.id.$eq === id,
      );
    const draftRead = readOf(DRAFT)[0];
    const liveReads = readOf(LIVE);
    expect(draftRead).toBeDefined();
    expect(liveReads).toHaveLength(1);

    for (const [, options] of [draftRead!, liveReads[0]]) {
      expect(options).toEqual(expect.objectContaining({ cache: "no-store" }));
      // cache and next are mutually exclusive in Next 15: passing both breaks caching
      expect(options).not.toHaveProperty("next");
      // Every lesson field (content, lineage) with the blocks populated, in order
      expect(options.urlParams.populate.lessons).toEqual({
        fields: ["*"],
        populate: LESSON_BLOCKS_POPULATE,
        sort: ["orderIndex:asc"],
      });
    }
  });

  it("never sends slug, notes, droplets, lineage, locks or regenerateSlug in a lesson update", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    // Change every kind of field at once: a rename, a type change, a reorder
    // (Intro moves last), a v1 content edit and a v2 content edit
    const intro = fake.draftLesson("Intro");
    const quiz = fake.draftLesson("Quiz");
    const wrapUp = fake.draftLesson("Wrap up");
    intro.name = "Intro v2";
    intro.type = "setup";
    quiz.blocks = [quizBlock("Five", 120)];
    wrapUp.blocksV2 = [paragraph("bn-wrap", "Done, edited")];
    quiz.orderIndex = 0;
    wrapUp.orderIndex = 1;
    intro.orderIndex = 2;

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(true);
    const puts = fake.requests("PUT", LESSON_PUT);
    expect(puts.map((put) => put.path).sort()).toEqual([
      `/api/lessons/${INTRO}`,
      `/api/lessons/${QUIZ}`,
      `/api/lessons/${WRAP_UP}`,
    ]);

    const allowed = [
      "name",
      "type",
      "orderIndex",
      "blocksVersion",
      "blocks",
      "blocksV2",
    ];
    const forbidden = [
      "slug",
      "notes",
      "highlights",
      "enrollments",
      "droplets",
      "droplet_lessons",
      "originalLessonId",
      "lockedBy",
      "lockedAt",
      "regenerateSlug",
    ];
    for (const put of puts) {
      const data = put.body?.data ?? {};
      expect(allowed).toEqual(expect.arrayContaining(Object.keys(data)));
      for (const key of forbidden) expect(data).not.toHaveProperty(key);
    }

    // Each lesson got exactly the fields that changed
    const bodyOf = (lessonId: number) =>
      puts.find((put) => put.path === `/api/lessons/${lessonId}`)?.body?.data;
    expect(Object.keys(bodyOf(INTRO) ?? {}).sort()).toEqual(
      ["name", "orderIndex", "type"].sort(),
    );
    expect(Object.keys(bodyOf(QUIZ) ?? {}).sort()).toEqual(
      ["blocks", "orderIndex"].sort(),
    );
    expect(Object.keys(bodyOf(WRAP_UP) ?? {}).sort()).toEqual(
      ["blocksV2", "orderIndex"].sort(),
    );

    // And the end state agrees: slugs and the student's notes and highlights are untouched
    expect(fake.lessonsOf(LIVE).map(({ id, slug }) => ({ id, slug }))).toEqual([
      { id: QUIZ, slug: "quiz" },
      { id: WRAP_UP, slug: "wrap-up" },
      { id: INTRO, slug: "intro" },
    ]);
    expect(fake.lessonsOf(LIVE).map((l) => l.noteIds)).toEqual([
      [noteOf(QUIZ)],
      [noteOf(WRAP_UP)],
      [noteOf(INTRO)],
    ]);
    expect(fake.lessonsOf(LIVE).map((l) => l.highlightIds)).toEqual([
      [highlightOf(QUIZ)],
      [highlightOf(WRAP_UP)],
      [highlightOf(INTRO)],
    ]);
  });

  // ── beyond the plan's 11 cases: two acceptance criteria no case above covers ──

  it("finishes the job when published again after a failure, without duplicating the lesson it created", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    // The author keeps Intro, removes Quiz and Wrap up, and adds a lesson
    fake.lessons.delete(fake.draftLesson("Quiz").id);
    fake.lessons.delete(fake.draftLesson("Wrap up").id);
    fake.addLesson({
      id: 104,
      dropletId: DRAFT,
      name: "Fresh",
      orderIndex: 1,
      blocks: [genericBlock("New", 140)],
    });
    // First attempt: the lesson is created, then removing Quiz is refused
    fake.failDelete(QUIZ, "Cannot delete lesson");

    const first = await publishDraftToOriginal(DRAFT, LIVE);

    expect(first.ok).toBe(false);
    expect(fake.requests("POST", LESSON_POST)).toHaveLength(1);
    expect(fake.lessonsOf(LIVE).map((l) => l.name)).toEqual([
      "Intro",
      "Quiz",
      "Fresh",
    ]);
    expect(fake.draftWasDeleted()).toBe(false);

    // Second attempt, after the problem is gone: Fresh is matched by name, not created again
    fake.clearFailures();
    const second = await publishDraftToOriginal(DRAFT, LIVE);

    expect(second).toEqual({ ok: true, error: null, slug: "my-droplet" });
    expect(fake.requests("POST", LESSON_POST)).toHaveLength(1);
    expect(fake.lessonsOf(LIVE).map((l) => l.name)).toEqual(["Intro", "Fresh"]);
    expect(fake.progress(STUDENT)).toEqual([INTRO]);
    expect(fake.draftWasDeleted()).toBe(true);
  });

  it("writes in the documented order: droplet, lesson updates, creates, deletes, then enrollments and the draft", async () => {
    seedLiveDroplet(fake);
    seedDraft(fake);
    fake.enrollments.push({
      id: AUTHOR_ENROLLMENT,
      droplet: DRAFT,
      viewedLessons: [101],
    });
    // One update, one create and one delete
    fake.draftLesson("Intro").name = "Intro v2";
    fake.lessons.delete(fake.draftLesson("Wrap up").id);
    fake.addLesson({
      id: 104,
      dropletId: DRAFT,
      name: "Fresh",
      orderIndex: 2,
      blocks: [genericBlock("New", 140)],
    });

    const result = await publishDraftToOriginal(DRAFT, LIVE);

    expect(result.ok).toBe(true);
    expect(phases(fake.log)).toEqual([
      "read draft enrollments",
      `PUT /api/droplets/${LIVE}`,
      "update lesson",
      "create lesson",
      "delete live lesson",
      "move enrollment",
      "delete draft lesson",
      `DELETE /api/droplets/${DRAFT}`,
    ]);
    expect(fake.enrollment(AUTHOR_ENROLLMENT).droplet).toBe(LIVE);
  });
});
