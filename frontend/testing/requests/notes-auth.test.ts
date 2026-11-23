// Ownership gate for getNotesByAuthorizedUserAndLesson (ODY-508). It's
// callable from the browser, so the id argument must be the caller's own.
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);

const NOTES = [{ id: 1, content: "my note", positionY: 0 }];

beforeEach(() => {
  jest.clearAllMocks();
});

// The "mutation" here is the Strapi read itself: denied callers must not
// reach Strapi at all.
describeServerActionAuth("getNotesByAuthorizedUserAndLesson", {
  requireRole: mockedRequireRole,
  invoke: () => getNotesByAuthorizedUserAndLesson(7, "some-lesson"),
  mutations: () => [mockedFetchAPI],
  denial: { kind: "owner", nonOwner: authFixtures.as({ id: 99 }) },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(NOTES);
    },
    expect: (result) => expect(result).toEqual(NOTES),
  },
  expectDenied: (result) => expect(result).toEqual([]),
});

describe("getNotesByAuthorizedUserAndLesson ownership", () => {
  it("doesn't let a SysAdmin read another user's notes", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));

    const result = await getNotesByAuthorizedUserAndLesson(7, "some-lesson");

    expect(result).toEqual([]);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("queries only the caller's own notes, under their notes tag", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(NOTES);

    await getNotesByAuthorizedUserAndLesson(7, "some-lesson");

    expect(mockedFetchAPI).toHaveBeenCalledWith("/notes", {
      urlParams: expect.objectContaining({
        filters: {
          enrollment: { authorizedUser: { id: { $eq: 7 } } },
          lesson: { slug: { $eq: "some-lesson" } },
        },
      }),
      next: { tags: ["notes-7"], revalidate: 900 },
    });
  });
});
