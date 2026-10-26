import {
  addLesson,
  deleteLesson,
  duplicateLessonToDroplet,
  updateLesson,
} from "@/lib/requests/lesson";
import { requireRole } from "@/lib/auth/require-role";
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
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/lib/strapi-document-id", () => ({
  ...jest.requireActual("@/lib/strapi-document-id"),
  strapiEntryUrl: jest.fn().mockResolvedValue("http://strapi.test/api/x/doc"),
  resolveDocumentId: jest.fn().mockResolvedValue("doc"),
  resolveDocumentIds: jest.fn().mockResolvedValue(["doc"]),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

let fetchMock: jest.MockedFunction<typeof fetch>;

/** Routes the review-freeze lookups: a droplet owned by 7, optionally in review. */
function routeLookups(inReview = false, owners: number[] = [7]) {
  const droplet = {
    id: 1,
    name: "N",
    inReview,
    status: "draft",
    originalDropletId: null,
    authorized_users: owners.map((id) => ({ id })),
  };
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path === "/lessons") return [{ id: 5, droplets: [droplet] }];
    if (path === "/droplets") return [droplet];
    return [];
  }) as never);
}

function routeWrites() {
  fetchMock.mockResolvedValue(
    makeFetchResponse({
      data: { id: 5, attributes: { name: "L", blocks: [] } },
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
});

const expectDenied = (result: unknown, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

const actions: [string, () => Promise<unknown>][] = [
  ["updateLesson", () => updateLesson(5, { name: "x" })],
  ["addLesson", () => addLesson({ name: "x", dropletId: 1, orderIndex: 0 })],
  ["deleteLesson", () => deleteLesson(5)],
  ["duplicateLessonToDroplet", () => duplicateLessonToDroplet(5, 1, 0)],
];

for (const [name, invoke] of actions) {
  describeServerActionAuth(name, {
    requireRole: mockedRequireRole,
    invoke,
    mutations: () => [fetchMock, mockedRevalidateTag],
    denial: {
      kind: "owner",
      nonOwner: authFixtures.as({ id: 99 }),
      arrange: () => routeLookups(),
    },
    authorized: {
      as: authFixtures.as({ id: 7 }),
      arrange: () => {
        routeLookups();
        routeWrites();
      },
      expect: (result) => {
        expect(result).not.toMatchObject({ error: "forbidden" });
        expect(result).not.toMatchObject({ error: "in_review" });
      },
    },
    expectDenied,
  });

  describe(`${name}: review freeze`, () => {
    it.each([
      ["Content Creator", [Role.ContentCreator]],
      ["Content Editor", [Role.ContentEditor]],
      ["Faculty", [Role.Faculty]],
      ["System Admin", [Role.SysAdmin]],
    ])("refuses a %s author of an in-review droplet", async (_n, roles) => {
      mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7, roles }));
      routeLookups(true);
      routeWrites();

      const result = await invoke();

      expect(result).toEqual({ ok: false, error: "in_review", data: null });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("allows a non-author Content Editor in review", async () => {
      mockedRequireRole.mockResolvedValue(
        authFixtures.as({ id: 9, roles: [Role.ContentEditor] }),
      );
      routeLookups(true);
      routeWrites();

      const result = await invoke();

      expect(result).not.toMatchObject({ error: "in_review" });
      expect(result).not.toMatchObject({ error: "forbidden" });
      expect(fetchMock).toHaveBeenCalled();
    });
  });
}
