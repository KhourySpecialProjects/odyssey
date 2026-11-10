jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

import { fetchAPI } from "@/lib/utils";
import {
  checkDatasetWrite,
  checkDropletContentWrite,
  checkDropletUpdate,
  checkLessonWrite,
  checkPublishDraft,
  classifyDropletChange,
  getLessonReviewState,
  loadDatasetDroplet,
  loadDropletForWrite,
  loadLessonDroplets,
} from "@/lib/auth/review-freeze";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";

const mockFetch = jest.mocked(fetchAPI);

const user = (id: number, roles: Role[]) => ({
  id,
  email: "a@example.invalid",
  roles,
});

const droplet = (over: Record<string, unknown> = {}) => ({
  id: 1,
  documentId: "doc1",
  name: "N",
  inReview: false,
  status: "draft",
  originalDropletId: null,
  authorized_users: [{ id: 7 }],
  ...over,
});

const stored = (over: Record<string, unknown> = {}) => droplet(over);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("classifyDropletChange", () => {
  const base = {
    status: false,
    afterReview: false,
    content: false,
    inReview: undefined,
  };
  it.each([
    [{}, base],
    [{ name: "N" }, base],
    [{ name: "Other" }, { ...base, content: true }],
    [{ name: undefined, description: undefined }, base],
    [{ description: "x" }, { ...base, content: true }],
    [{ inReview: true }, { ...base, inReview: true }],
    [{ inReview: false }, { ...base, inReview: false }],
    [
      { name: "N", inReview: false, status: "published" },
      { ...base, status: true, inReview: false },
    ],
    [
      { inReview: false, afterReview: "x" },
      { ...base, afterReview: true, inReview: false },
    ],
  ])("classifies %j", (data, expected) => {
    expect(classifyDropletChange(data as never, { name: "N" })).toEqual(
      expected,
    );
  });
});

describe("regenerateSlug", () => {
  it("counts a slug regeneration as a content change", () => {
    expect(
      classifyDropletChange({}, { name: "N" }, { regenerateSlug: true }),
    ).toEqual({
      status: false,
      afterReview: false,
      content: true,
      inReview: undefined,
    });
  });

  it("refuses an in-review author's slug regeneration", async () => {
    mockFetch.mockResolvedValue([stored({ inReview: true })]);
    const author = user(7, [Role.ContentCreator]) as never;

    expect(
      await checkDropletUpdate(
        author,
        1,
        { name: "N" },
        { regenerateSlug: true },
      ),
    ).toEqual({ ok: false, error: "in_review" });
    expect(
      await checkDropletUpdate(
        author,
        1,
        { name: "N" },
        { regenerateSlug: false },
      ),
    ).toEqual({ ok: true });
  });

  it("does not stop a reviewer", async () => {
    mockFetch.mockResolvedValue([stored({ inReview: true })]);

    expect(
      await checkDropletUpdate(
        user(9, [Role.ContentEditor]) as never,
        1,
        { name: "N" },
        { regenerateSlug: true },
      ),
    ).toEqual({ ok: true });
  });
});

describe("loaders", () => {
  it("loadDropletForWrite queries fresh by numeric id", async () => {
    mockFetch.mockResolvedValue([droplet({ inReview: null })]);
    const result = await loadDropletForWrite(1);
    expect(mockFetch).toHaveBeenCalledWith("/droplets", {
      urlParams: {
        filters: { id: { $eq: 1 } },
        fields: [
          "id",
          "documentId",
          "name",
          "inReview",
          "status",
          "originalDropletId",
        ],
        populate: { authorized_users: { fields: ["id"] } },
        pagination: { pageSize: 1, page: 1 },
      },
      cache: "no-store",
    });
    expect(result).toEqual({
      id: 1,
      documentId: "doc1",
      name: "N",
      inReview: false,
      status: "draft",
      originalDropletId: null,
      ownerIds: [7],
    });
  });

  it("loadDropletForWrite returns null for a missing droplet", async () => {
    mockFetch.mockResolvedValue([]);
    expect(await loadDropletForWrite(1)).toBeNull();
  });

  it("loadLessonDroplets populates droplets and authors", async () => {
    mockFetch.mockResolvedValue([{ id: 5, droplets: [droplet()] }]);
    const result = await loadLessonDroplets(5);
    expect(mockFetch).toHaveBeenCalledWith("/lessons", {
      urlParams: {
        filters: { id: { $eq: 5 } },
        fields: ["id"],
        populate: {
          droplets: {
            fields: [
              "id",
              "documentId",
              "name",
              "inReview",
              "status",
              "originalDropletId",
            ],
            populate: { authorized_users: { fields: ["id"] } },
          },
        },
        pagination: { pageSize: 1, page: 1 },
      },
      cache: "no-store",
    });
    expect(result).toHaveLength(1);
    expect(result?.[0].ownerIds).toEqual([7]);
  });

  it("loadLessonDroplets returns null for a missing lesson", async () => {
    mockFetch.mockResolvedValue([]);
    expect(await loadLessonDroplets(5)).toBeNull();
  });

  it("loadDatasetDroplet populates the droplet", async () => {
    mockFetch.mockResolvedValue([{ id: 3, droplet: droplet() }]);
    const result = await loadDatasetDroplet(3);
    expect(mockFetch).toHaveBeenCalledWith("/datasets", {
      urlParams: {
        filters: { id: { $eq: 3 } },
        fields: ["id"],
        populate: {
          droplet: {
            fields: [
              "id",
              "documentId",
              "name",
              "inReview",
              "status",
              "originalDropletId",
            ],
            populate: { authorized_users: { fields: ["id"] } },
          },
        },
        pagination: { pageSize: 1, page: 1 },
      },
      cache: "no-store",
    });
    expect(result?.droplet?.id).toBe(1);
  });

  it("loadDatasetDroplet handles no droplet and missing dataset", async () => {
    mockFetch.mockResolvedValueOnce([{ id: 3, droplet: null }]);
    expect(await loadDatasetDroplet(3)).toEqual({ droplet: null });
    mockFetch.mockResolvedValueOnce([]);
    expect(await loadDatasetDroplet(3)).toBeNull();
  });
});

describe("checkDropletUpdate", () => {
  const run = (u: ReturnType<typeof user>, data: object, over = {}) => {
    mockFetch.mockResolvedValue([stored(over)]);
    return checkDropletUpdate(u as never, 1, data as never);
  };
  const FORBIDDEN = { ok: false, error: "forbidden" };

  describe.each([
    ["Creator author", 7, Role.ContentCreator],
    ["Editor author", 7, Role.ContentEditor],
    ["Faculty author", 7, Role.Faculty],
    ["SysAdmin author", 7, Role.SysAdmin],
    ["non-author Editor", 9, Role.ContentEditor],
    ["non-author Admin", 9, Role.SysAdmin],
  ])("%s", (_n, id, role) => {
    const u = user(id, [role]);
    it.each([
      ["inReview: true", { inReview: true }],
      ["inReview: false", { inReview: false }],
      ["afterReview", { afterReview: "x" }],
    ])("refuses %s in or out of review", async (_k, data) => {
      expect(await run(u, data)).toEqual(FORBIDDEN);
      expect(await run(u, data, { inReview: true })).toEqual(FORBIDDEN);
    });
    it("refuses status in review", async () => {
      expect(await run(u, { status: "published" }, { inReview: true })).toEqual(
        FORBIDDEN,
      );
    });
  });

  describe("Content Creator author", () => {
    const creator = user(7, [Role.ContentCreator]);
    it("in review: content gives in_review", async () => {
      expect(
        await run(creator, { description: "x" }, { inReview: true }),
      ).toEqual({ ok: false, error: "in_review" });
    });
    it("not in review: content is ok, status forbidden", async () => {
      expect(await run(creator, { description: "x" })).toEqual({ ok: true });
      expect(await run(creator, { status: "published" })).toEqual(FORBIDDEN);
    });
  });

  describe.each([
    ["Editor", Role.ContentEditor],
    ["Faculty", Role.Faculty],
    ["SysAdmin", Role.SysAdmin],
  ])("%s-author in review", (_n, role) => {
    it("content gives in_review", async () => {
      expect(
        await run(user(7, [role]), { overview: "x" }, { inReview: true }),
      ).toEqual({ ok: false, error: "in_review" });
    });
  });

  it.each([
    ["Faculty", Role.Faculty],
    ["SysAdmin", Role.SysAdmin],
  ])("%s-author not in review may publish directly", async (_n, role) => {
    expect(await run(user(7, [role]), { status: "published" })).toEqual({
      ok: true,
    });
  });

  it("Editor-author not in review cannot set status", async () => {
    expect(
      await run(user(7, [Role.ContentEditor]), { status: "published" }),
    ).toEqual(FORBIDDEN);
  });

  describe("non-author Editor", () => {
    const editor = user(9, [Role.ContentEditor]);
    it("content is ok when not in review", async () => {
      expect(await run(editor, { description: "x" })).toEqual({ ok: true });
    });
    it("status is forbidden when not in review", async () => {
      expect(await run(editor, { status: "published" })).toEqual(FORBIDDEN);
    });
    it("content is ok in review", async () => {
      expect(
        await run(editor, { description: "x" }, { inReview: true }),
      ).toEqual({ ok: true });
    });
  });

  it("non-author Creator is forbidden", async () => {
    expect(
      await run(user(9, [Role.ContentCreator]), { description: "x" }),
    ).toEqual({ ok: false, error: "forbidden" });
  });

  // ODY-860: a creator's withdrawn draft isn't the Admin's to publish
  describe("non-author Admin", () => {
    const admin = user(9, [Role.SysAdmin]);
    it("status is forbidden when not in review", async () => {
      expect(await run(admin, { status: "published" })).toEqual(FORBIDDEN);
    });
    it("content is ok when not in review", async () => {
      expect(await run(admin, { description: "x" })).toEqual({ ok: true });
    });
  });

  it("returns Not Found for a missing droplet", async () => {
    mockFetch.mockResolvedValue([]);
    expect(
      await checkDropletUpdate(user(7, []) as never, 1, { description: "x" }),
    ).toEqual({ ok: false, error: "Not Found" });
  });

  it("fails closed when the lookup throws", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));
    expect(
      await checkDropletUpdate(user(7, []) as never, 1, { description: "x" }),
    ).toEqual({ ok: false, error: "Could not verify edit access." });
  });
});

describe("checkDropletContentWrite", () => {
  it("refuses an in-review author and allows a reviewer", async () => {
    mockFetch.mockResolvedValue([droplet({ inReview: true })]);
    expect(
      await checkDropletContentWrite(
        user(7, [Role.ContentCreator]) as never,
        1,
      ),
    ).toEqual({ ok: false, error: "in_review" });
    expect(
      await checkDropletContentWrite(user(9, [Role.ContentEditor]) as never, 1),
    ).toEqual({ ok: true });
  });

  it("returns Not Found and fails closed", async () => {
    mockFetch.mockResolvedValueOnce([]);
    expect(await checkDropletContentWrite(user(7, []) as never, 1)).toEqual({
      ok: false,
      error: "Not Found",
    });
    mockFetch.mockRejectedValueOnce(new Error("x"));
    expect(await checkDropletContentWrite(user(7, []) as never, 1)).toEqual({
      ok: false,
      error: "Could not verify edit access.",
    });
  });
});

describe("checkLessonWrite", () => {
  const author = user(7, [Role.ContentCreator]);
  it("a lesson in two droplets, one in review, gives in_review", async () => {
    mockFetch.mockResolvedValue([
      {
        id: 5,
        droplets: [droplet({ id: 1 }), droplet({ id: 2, inReview: true })],
      },
    ]);
    expect(await checkLessonWrite(author as never, 5)).toEqual({
      ok: false,
      error: "in_review",
    });
  });
  it("needs write rights on every droplet", async () => {
    mockFetch.mockResolvedValue([
      {
        id: 5,
        droplets: [
          droplet({ id: 1 }),
          droplet({ id: 2, authorized_users: [] }),
        ],
      },
    ]);
    expect(await checkLessonWrite(author as never, 5)).toEqual({
      ok: false,
      error: "forbidden",
    });
  });
  it("allows an author of an editable lesson", async () => {
    mockFetch.mockResolvedValue([{ id: 5, droplets: [droplet()] }]);
    expect(await checkLessonWrite(author as never, 5)).toEqual({ ok: true });
  });
  it("a lesson with no droplet is forbidden except for Admin", async () => {
    mockFetch.mockResolvedValue([{ id: 5, droplets: [] }]);
    expect(await checkLessonWrite(author as never, 5)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(
      await checkLessonWrite(user(1, [Role.ContentEditor]) as never, 5),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      await checkLessonWrite(user(1, [Role.SysAdmin]) as never, 5),
    ).toEqual({
      ok: true,
    });
    expect(await checkLessonWrite(user(1, [Role.Faculty]) as never, 5)).toEqual(
      { ok: false, error: "forbidden" },
    );
  });
  it("missing lesson gives Not Found; lookup failure fails closed", async () => {
    mockFetch.mockResolvedValueOnce([]);
    expect(await checkLessonWrite(author as never, 5)).toEqual({
      ok: false,
      error: "Not Found",
    });
    mockFetch.mockRejectedValueOnce(new Error("x"));
    expect(await checkLessonWrite(author as never, 5)).toEqual({
      ok: false,
      error: "Could not verify edit access.",
    });
  });
});

describe("checkDatasetWrite", () => {
  it("an in-review dataset droplet gives in_review for its author", async () => {
    mockFetch.mockResolvedValue([
      { id: 3, droplet: droplet({ inReview: true }) },
    ]);
    expect(
      await checkDatasetWrite(user(7, [Role.ContentCreator]) as never, 3),
    ).toEqual({ ok: false, error: "in_review" });
    expect(
      await checkDatasetWrite(user(9, [Role.ContentEditor]) as never, 3),
    ).toEqual({ ok: true });
  });
  it("a dataset with no droplet is forbidden except for Admin", async () => {
    mockFetch.mockResolvedValue([{ id: 3, droplet: null }]);
    expect(
      await checkDatasetWrite(user(7, [Role.ContentEditor]) as never, 3),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      await checkDatasetWrite(user(1, [Role.SysAdmin]) as never, 3),
    ).toEqual({ ok: true });
  });
  it("missing dataset gives Not Found", async () => {
    mockFetch.mockResolvedValue([]);
    expect(
      await checkDatasetWrite(user(7, [Role.SysAdmin]) as never, 3),
    ).toEqual({ ok: false, error: "Not Found" });
  });
});

describe("checkPublishDraft", () => {
  const inReviewDraft = { inReview: true, originalDropletId: 50 };
  it("refuses a mismatched original", async () => {
    mockFetch.mockResolvedValue([droplet(inReviewDraft)]);
    expect(
      await checkPublishDraft(user(9, [Role.ContentEditor]) as never, 1, 51),
    ).toEqual({ ok: false, error: "forbidden" });
  });
  it("gives in_review to an author and to a non-author Editor", async () => {
    mockFetch.mockResolvedValue([droplet(inReviewDraft)]);
    expect(
      await checkPublishDraft(user(7, [Role.SysAdmin]) as never, 1, 50),
    ).toEqual({ ok: false, error: "in_review" });
    expect(
      await checkPublishDraft(user(9, [Role.ContentEditor]) as never, 1, 50),
    ).toEqual({ ok: false, error: "in_review" });
  });
  it("allows an Admin author outside review", async () => {
    mockFetch.mockResolvedValue([droplet({ originalDropletId: 50 })]);
    expect(
      await checkPublishDraft(user(7, [Role.SysAdmin]) as never, 1, 50),
    ).toEqual({ ok: true });
  });
  it("refuses a non-author Admin outside review (ODY-860)", async () => {
    mockFetch.mockResolvedValue([droplet({ originalDropletId: 50 })]);
    expect(
      await checkPublishDraft(user(9, [Role.SysAdmin]) as never, 1, 50),
    ).toEqual({ ok: false, error: "forbidden" });
  });
  it("fails closed", async () => {
    mockFetch.mockRejectedValue(new Error("x"));
    expect(
      await checkPublishDraft(user(9, [Role.ContentEditor]) as never, 1, 50),
    ).toEqual({ ok: false, error: "Could not verify edit access." });
  });
});

describe("getLessonReviewState", () => {
  it("reports review and reviewer state across droplets", async () => {
    mockFetch.mockResolvedValue([
      {
        id: 5,
        droplets: [droplet({ id: 1 }), droplet({ id: 2, inReview: true })],
      },
    ]);
    expect(
      await getLessonReviewState(user(9, [Role.ContentEditor]) as never, 5),
    ).toEqual({ inReview: true, isReviewer: true });
    expect(
      await getLessonReviewState(user(7, [Role.ContentEditor]) as never, 5),
    ).toEqual({ inReview: true, isReviewer: false });
  });
  it("not in review", async () => {
    mockFetch.mockResolvedValue([{ id: 5, droplets: [droplet()] }]);
    expect(
      await getLessonReviewState(user(7, [Role.ContentCreator]) as never, 5),
    ).toEqual({ inReview: false, isReviewer: false });
  });
  it("returns null for a missing lesson or a failed lookup", async () => {
    mockFetch.mockResolvedValueOnce([]);
    expect(await getLessonReviewState(user(7, []) as never, 5)).toBeNull();
    mockFetch.mockRejectedValueOnce(new Error("x"));
    expect(await getLessonReviewState(user(7, []) as never, 5)).toBeNull();
  });
});

describe("id validation", () => {
  const sneaky = { id: 1, documentId: "frozendoc" } as never;
  const u = user(7, [Role.SysAdmin]) as never;

  it.each([
    ["an object", sneaky],
    ["a string", "1" as never],
    ["zero", 0],
    ["a negative number", -1],
    ["a fraction", 1.5],
    ["NaN", NaN],
    ["undefined", undefined as never],
  ])("refuses %s before any lookup", async (_name, bad) => {
    const forbidden = { ok: false, error: "forbidden" };

    expect(await checkDropletContentWrite(u, bad)).toEqual(forbidden);
    expect(await checkLessonWrite(u, bad)).toEqual(forbidden);
    expect(await checkDatasetWrite(u, bad)).toEqual(forbidden);
    expect(await checkDropletUpdate(u, bad, { description: "x" })).toEqual(
      forbidden,
    );
    expect(await checkPublishDraft(u, bad, 2)).toEqual(forbidden);
    expect(await checkPublishDraft(u, 1, bad)).toEqual(forbidden);
    expect(await getLessonReviewState(u, bad)).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
