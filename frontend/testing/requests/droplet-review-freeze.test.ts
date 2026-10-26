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
  it("lets author 7 submit when not in review", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(
      1,
      { name: "N", inReview: true },
      { regenerateSlug: false },
    );

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([
      { name: "N", inReview: true, regenerateSlug: false },
    ]);
  });

  it("lets author 7 withdraw while in review, sending only inReview", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, { inReview: false });

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([{ inReview: false, regenerateSlug: false }]);
  });

  it("refuses a Withdraw that regenerates the slug, with no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(
      1,
      { inReview: false },
      { regenerateSlug: true },
    );

    expect(result).toEqual({ ok: false, error: "in_review", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("refuses status from a creator author and sends no PUT", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, {
      name: "N",
      inReview: false,
      status: "published",
    });

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("refuses afterReview from a creator author", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));

    const result = await updateDroplet(1, { afterReview: "x" });

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

    const requestChanges = await updateDroplet(1, {
      name: "N",
      inReview: false,
      afterReview: "x",
    });
    const publish = await updateDroplet(1, {
      name: "N",
      status: "published",
      inReview: false,
    });
    const direct = await publishDraftToOriginal(1, 2);

    expect(requestChanges).toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(publish).toEqual({ ok: false, error: "forbidden", data: null });
    expect(direct).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(putBodies()).toEqual([]);

    const withdraw = await updateDroplet(1, { inReview: false });
    expect(withdraw).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([{ inReview: false, regenerateSlug: false }]);
  });

  it("lets a non-author Editor request changes and publish in review", async () => {
    routeDroplet(true);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const requestChanges = await updateDroplet(1, {
      name: "N",
      inReview: false,
      afterReview: "fix",
    });
    const publish = await updateDroplet(1, {
      name: "N",
      status: "published",
      inReview: false,
    });

    expect(requestChanges).toMatchObject({ ok: true });
    expect(publish).toMatchObject({ ok: true });
    expect(putBodies()).toEqual([
      { name: "N", inReview: false, afterReview: "fix", regenerateSlug: false },
      {
        name: "N",
        inReview: false,
        status: "published",
        regenerateSlug: false,
      },
    ]);
  });

  it("refuses status from a non-author Editor when not in review", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));

    const result = await updateDroplet(1, { status: "published" });

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(putBodies()).toEqual([]);
  });

  it("lets a non-author Admin publish", async () => {
    routeDroplet(false);
    mockedRequireRole.mockResolvedValue(as(9, Role.SysAdmin));

    const result = await updateDroplet(1, { status: "published" });

    expect(result).toMatchObject({ ok: true });
    expect(putBodies()).toHaveLength(1);
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
    draft();
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentCreator));

    const result = await publishDraftToOriginal(1, 2);

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gets past the check for a non-author Editor in review", async () => {
    draft();
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));
    jest
      .mocked(getCurrentUser)
      .mockResolvedValue({ email: "editor@example.invalid" } as never);
    jest.mocked(getAuthorizedUserByEmail).mockResolvedValue({ id: 9 } as never);

    const result = await publishDraftToOriginal(1, 2);

    // The fixture is too thin to finish publishing, but the flow must have
    // carried on past the check: it re-read the draft in full (the check only
    // reads a few fields), which a refusal never does.
    const fullReads = mockedFetchAPI.mock.calls.filter(
      ([, config]) =>
        (config as { urlParams?: { fields?: string[] } }).urlParams
          ?.fields?.[0] === "*",
    );
    expect(fullReads.length).toBeGreaterThan(0);
    expect(mockedFetchAPI.mock.calls.length).toBeGreaterThan(1);
    expect(result.error).not.toBe("forbidden");
    expect(result.error).not.toBe("in_review");
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
