import { publishDraftToOriginal } from "@/lib/requests/droplet";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import {
  makeDroplet,
  mockGlobalFetch,
  makeFetchResponse,
} from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentByUserAndDroplet: jest.fn(),
}));
jest.mock("@/lib/requests/lesson", () => ({ deleteLesson: jest.fn() }));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const { SysAdmin, Faculty, ContentEditor } = AuthorizedUserRoleTitle;
const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

const DRAFT_ID = 20;
const ORIGINAL_ID = 10;

/** An [EDIT] draft of droplet 10, written by authorized user 7. */
const draftRow = (overrides = {}) =>
  makeDroplet({
    id: DRAFT_ID,
    documentId: `doc${DRAFT_ID}`,
    status: "edit",
    inReview: false,
    originalDropletId: ORIGINAL_ID,
    authorized_users: [{ id: 7 }],
    ...overrides,
  });

const ALL_TAGS = [
  CACHE_TAGS.authors,
  CACHE_TAGS.droplets,
  CACHE_TAGS.lesson,
  CACHE_TAGS.playlists,
  CACHE_TAGS.voyages,
  CACHE_TAGS.allEnrollments,
  CACHE_TAGS.allGroups,
  CACHE_TAGS.allUserContent,
  CACHE_TAGS.allUserDashboards,
  CACHE_TAGS.review(DRAFT_ID),
  CACHE_TAGS.review(ORIGINAL_ID),
];

const revalidated = () => mockedRevalidateTag.mock.calls.map(([tag]) => tag);

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedFetchAPI.mockResolvedValue([draftRow()]);
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { slug: "live-droplet" } }),
  );
});

const publish = () => publishDraftToOriginal(DRAFT_ID, ORIGINAL_ID);

describeServerActionAuth("publishDraftToOriginal", {
  requireRole: mockedRequireRole,
  invoke: publish,
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99, roles: [Faculty] }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([draftRow()]);
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7, roles: [Faculty] }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([draftRow()]);
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { slug: "live-droplet" } }),
      );
    },
    expect: (result) =>
      expect(result).toEqual({ ok: true, error: null, slug: "live-droplet" }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, slug: null }),
});

describe("publishDraftToOriginal: who may publish", () => {
  it("allows an admin who did not write the draft", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));

    expect((await publish()).ok).toBe(true);
  });

  it("refuses an Editor on a draft that is in review, with no request", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 99, roles: [ContentEditor] }),
    );
    mockedFetchAPI.mockResolvedValue([draftRow({ inReview: true })]);

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "in_review", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an Editor on a draft that is not in review, with no request or revalidation", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 99, roles: [ContentEditor] }),
    );

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses Faculty who are also Editors on a draft they did not write, outside review", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 99, roles: [Faculty, ContentEditor] }),
    );

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an author while the draft is in review, whatever their role", async () => {
    mockedFetchAPI.mockResolvedValue([draftRow({ inReview: true })]);
    for (const roles of [[Faculty], [ContentEditor], [SysAdmin]]) {
      mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7, roles }));

      const result = await publish();

      expect(result).toEqual({ ok: false, error: "in_review", slug: null });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses an Editor who wrote the draft while it is not in review, with no request", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 7, roles: [ContentEditor] }),
    );

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not found, with no request, when the read has no documentId", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue([draftRow({ documentId: undefined })]);

    const result = await publish();

    expect(result).toEqual({
      ok: false,
      error: "Draft droplet not found",
      slug: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses when the draft belongs to a different original, with no request", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue([draftRow({ originalDropletId: 11 })]);

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "forbidden", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not found when the draft cannot be read, with no request", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue([]);

    const result = await publish();

    expect(result).toEqual({ ok: false, error: "Not Found", slug: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("publishDraftToOriginal: the request", () => {
  beforeEach(() => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
  });

  it("makes one POST to the server-fetched documentId with the v4 header", async () => {
    await publish();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/droplets\/doc20\/publish-edit$/);
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(JSON.parse(String(init?.body))).toEqual({
      originalDropletId: ORIGINAL_ID,
    });
    expect(init?.headers).toMatchObject({ "Strapi-Response-Format": "v4" });
  });

  it("reads the draft fresh", async () => {
    await publish();

    const [path, options] = mockedFetchAPI.mock.calls[0];
    expect(path).toBe("/droplets");
    expect(options).toMatchObject({
      cache: "no-store",
      urlParams: {
        fields: expect.arrayContaining(["inReview", "originalDropletId"]),
        populate: { authorized_users: { fields: ["id"] } },
      },
    });
  });

  it("revalidates every tag on success", async () => {
    const result = await publish();

    expect(result).toEqual({ ok: true, error: null, slug: "live-droplet" });
    expect(revalidated().sort()).toEqual([...ALL_TAGS].sort());
  });

  it("flushes both review tags on a 2xx and a 5xx, and on a 4xx neither", async () => {
    const review = [
      CACHE_TAGS.review(DRAFT_ID),
      CACHE_TAGS.review(ORIGINAL_ID),
    ];

    await publish();
    expect(revalidated()).toEqual(expect.arrayContaining(review));

    mockedRevalidateTag.mockClear();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "Boom" } }, 500),
    );
    await publish();
    expect(revalidated()).toEqual(expect.arrayContaining(review));

    mockedRevalidateTag.mockClear();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "Nope" } }, 409),
    );
    await publish();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns Strapi's message and revalidates nothing on a 400", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse(
        {
          data: null,
          error: {
            status: 400,
            message:
              'Publishing failed (lesson "Intro": too long). Nothing was changed.',
          },
        },
        400,
      ),
    );

    const result = await publish();

    expect(result).toEqual({
      ok: false,
      error:
        'Publishing failed (lesson "Intro": too long). Nothing was changed.',
      slug: null,
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("does not revalidate on a 404 or 409", async () => {
    for (const status of [404, 409]) {
      fetchMock.mockResolvedValue(
        makeFetchResponse({ error: { status, message: "Nope" } }, status),
      );
      expect((await publish()).error).toBe("Nope");
    }
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("fails and still revalidates on a 500", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse(
        {
          error: {
            status: 500,
            message: "Publishing failed. Nothing was changed. Try again.",
          },
        },
        500,
      ),
    );

    const result = await publish();

    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      "Publishing failed. Nothing was changed. Try again.",
    );
    expect(revalidated().sort()).toEqual([...ALL_TAGS].sort());
  });

  it("says the publish is unconfirmed on a 502 with no JSON body, and revalidates", async () => {
    const gateway = makeFetchResponse({}, 502);
    jest.spyOn(gateway, "json").mockRejectedValue(new SyntaxError("not json"));
    fetchMock.mockResolvedValue(gateway);

    const result = await publish();

    expect(result).toEqual({
      ok: false,
      error:
        "Publishing could not be confirmed. Reload to check whether it went through.",
      slug: null,
    });
    expect(revalidated().sort()).toEqual([...ALL_TAGS].sort());
  });

  it("fails and still revalidates when the request rejects", async () => {
    fetchMock.mockRejectedValue(new Error("socket hang up"));

    const result = await publish();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not be confirmed/);
    expect(revalidated().sort()).toEqual([...ALL_TAGS].sort());
  });
});
