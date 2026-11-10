import {
  publishDraftToOriginal,
  updateDroplet,
  updateDropletFunFact,
  updateDropletLearningObjective,
} from "@/lib/requests/droplet";
import { requireRole } from "@/lib/auth/require-role";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentByUserAndDroplet: jest.fn(),
}));
jest.mock("@/lib/requests/lesson-delete", () => ({
  deleteLessonRecord: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

let fetchMock: jest.MockedFunction<typeof fetch>;

/** The stored droplet every lookup returns: owned by 7. */
function routeDroplet(
  inReview: boolean,
  extra: Record<string, unknown> = {},
  owners: number[] = [7],
) {
  const droplet = {
    id: 1,
    documentId: "doc1",
    name: "N",
    inReview,
    status: "draft",
    originalDropletId: null,
    learningObjectives: [{ id: 1, objective: "old" }],
    authorized_users: owners.map((id) => ({ id })),
    ...extra,
  };
  mockedFetchAPI.mockResolvedValue([droplet] as never);
}

const as = (id: number, ...roles: Role[]) => authFixtures.as({ id, roles });

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));
});

/** The keys of every PUT body sent to Strapi. */
const putBodies = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)).data);

describeServerActionAuth("updateDroplet", {
  requireRole: mockedRequireRole,
  invoke: () => updateDroplet(1, { description: "x" }),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => routeDroplet(false),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => routeDroplet(false),
    expect: (result) => expect(result).toMatchObject({ ok: true }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("updateDroplet: status changes", () => {
  it("sends no inReview or afterReview key on an allowed update", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, { name: "N", description: "d" });

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([
      { name: "N", description: "d", regenerateSlug: false },
    ]);
  });

  it.each([
    ["Submit", { name: "N", inReview: true }],
    ["Withdraw", { inReview: false }],
    ["Request changes", { name: "N", inReview: false, afterReview: "x" }],
    ["afterReview alone", { afterReview: "x" }],
  ])("refuses %s at runtime, with no PUT", async (_n, data) => {
    for (const inReview of [false, true]) {
      routeDroplet(inReview);
      mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

      const result = await updateDroplet(1, data as never);

      expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    }
    expect(putBodies()).toEqual([]);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses status from a creator author and sends no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, { name: "N", status: "published" });

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("refuses content from a creator author while in review", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, { description: "x" });

    expect(result).toEqual({ ok: false, error: "in_review", data: null });
    expect(putBodies()).toEqual([]);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["Content Editor", Role.ContentEditor],
    ["Faculty", Role.Faculty],
    ["System Admin", Role.SysAdmin],
  ])("blocks self-review by a %s author in review", async (_n, role) => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, role));

    const publish = await updateDroplet(1, {
      name: "N",
      status: "published",
    });
    const direct = await publishDraftToOriginal(1, 2);

    expect(publish).toEqual({ ok: false, error: "forbidden", data: null });
    expect(direct).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(putBodies()).toEqual([]);
  });

  it("refuses a non-author Editor's publish in review, with no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const publish = await updateDroplet(1, { name: "N", status: "published" });

    expect(publish).toEqual({ ok: false, error: "forbidden", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("lets a non-author Editor edit content in review", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await updateDroplet(1, { description: "fix" });

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([
      { description: "fix", regenerateSlug: false },
    ]);
  });

  it("refuses status from a non-author Editor when not in review", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await updateDroplet(1, { status: "published" });

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("lets an Admin author publish", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(7, Role.SysAdmin));

    const result = await updateDroplet(1, { status: "published" });

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toHaveLength(1);
  });

  // ODY-860: a creator's withdrawn draft isn't the reviewer's to publish
  it("refuses a non-author Admin, with no PUT", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(9, Role.SysAdmin));

    const result = await updateDroplet(1, { status: "published" });

    expect(result).toMatchObject({ ok: false, error: "forbidden" });
    expect(putBodies()).toHaveLength(0);
  });
});

describeServerActionAuth("updateDropletLearningObjective", {
  requireRole: mockedRequireRole,
  invoke: () => updateDropletLearningObjective(1, "old", "new"),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => routeDroplet(false),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => routeDroplet(false),
    expect: (result) => expect(result).toEqual({ success: true }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ success: false, error: code }),
});

describeServerActionAuth("updateDropletFunFact", {
  requireRole: mockedRequireRole,
  invoke: () => updateDropletFunFact("fact", 1),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => routeDroplet(false),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => routeDroplet(false),
    expect: (result) => expect(result).toEqual({ success: true }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ success: false, error: code }),
});

describe("content actions: review freeze", () => {
  it("refuses a creator author's objective edit in review, with no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDropletLearningObjective(1, "old", "new");

    expect(result).toEqual({ success: false, error: "in_review" });
    expect(putBodies()).toEqual([]);
  });

  it("refuses a creator author's fun fact in review, with no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDropletFunFact("fact", 1);

    expect(result).toEqual({ success: false, error: "in_review" });
    expect(putBodies()).toEqual([]);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("lets a non-author Editor edit the fun fact in review", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await updateDropletFunFact("fact", 1);

    expect(result).toEqual({ success: true });
    expect(putBodies()).toEqual([{ funFact: "fact" }]);
  });
});

// The allowed path of publishDraftToOriginal runs a long multi-step flow, so
// its auth cases are explicit rather than generated.
describe("publishDraftToOriginal auth", () => {
  const draft = (over: Record<string, unknown> = {}) =>
    routeDroplet(true, { originalDropletId: 2, ...over });

  it("denies a logged-out caller before any lookup", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "unauthenticated", slug: null });
    expect(mockedRequireRole).toHaveBeenNthCalledWith(1, []);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a draft whose original does not match", async () => {
    draft();
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await publishDraftToOriginal(1, 3);

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses a non-reviewer", async () => {
    draft({ inReview: false });
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentCreator));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-author Editor while in review, with no POST", async () => {
    draft();
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "in_review", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-author Admin outside review, with no request (ODY-860)", async () => {
    draft({ inReview: false });
    mockedRequireRole.mockResolvedValue(as(9, Role.SysAdmin));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes for an Admin author outside review", async () => {
    draft({ inReview: false });
    mockedRequireRole.mockResolvedValue(as(7, Role.SysAdmin));
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { slug: "live" } }));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: true, error: null, slug: "live" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/api\/droplets\/doc1\/publish-edit$/,
    );
  });

  it("refuses an author with a reviewer role while in review", async () => {
    draft();
    mockedRequireRole.mockResolvedValue(as(7, Role.SysAdmin));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "in_review", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

describe("ids that are not plain integers", () => {
  const sneaky = { id: 1, documentId: "frozendoc" } as never;

  beforeEach(() => {
    mockedRequireRole.mockResolvedValue(as(1, Role.SysAdmin));
    routeDroplet(false);
  });

  it("refuses an object id with no lookup or write", async () => {
    expect(await updateDroplet(sneaky, { description: "x" })).toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(await updateDropletFunFact("f", sneaky)).toEqual({
      success: false,
      error: "forbidden",
    });
    expect(await updateDropletLearningObjective(sneaky, "a", "b")).toEqual({
      success: false,
      error: "forbidden",
    });
    expect(await publishDraftToOriginal(sneaky, 2)).toEqual({
      ok: false,
      error: "forbidden",
      slug: null,
    });
    expect(await publishDraftToOriginal(1, sneaky)).toEqual({
      ok: false,
      error: "forbidden",
      slug: null,
    });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
