import { createDataset, deleteDataset } from "@/lib/requests/dataset";
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

const NEW_DATASET = {
  name: "data.csv",
  format: "csv" as const,
  fileUrl: "https://cdn.example.com/data.csv",
  fileSize: 1024,
  droplet: 1,
};

/** Routes the lookups: the droplet (owned by 7) and a dataset on it. */
function routeLookups(inReview = false, withDroplet = true) {
  const droplet = {
    id: 1,
    name: "N",
    inReview,
    status: "draft",
    originalDropletId: null,
    authorized_users: [{ id: 7 }],
  };
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path === "/datasets") {
      return [{ id: 3, droplet: withDroplet ? droplet : null }];
    }
    if (path === "/droplets") return [droplet];
    return [];
  }) as never);
}

const as = (id: number, ...roles: Role[]) => authFixtures.as({ id, roles });

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 3, attributes: { name: "data.csv" } } }),
  );
});

describeServerActionAuth("createDataset", {
  requireRole: mockedRequireRole,
  invoke: () => createDataset(NEW_DATASET),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => routeLookups(),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => routeLookups(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("deleteDataset", {
  requireRole: mockedRequireRole,
  invoke: () => deleteDataset(3),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => routeLookups(),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => routeLookups(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code }),
});

describe("dataset record actions: review freeze", () => {
  it.each([
    ["Content Creator", Role.ContentCreator],
    ["Content Editor", Role.ContentEditor],
    ["Faculty", Role.Faculty],
  ])(
    "refuses a %s author in review, with no POST or DELETE",
    async (_n, role) => {
      mockedRequireRole.mockResolvedValue(as(7, role));
      routeLookups(true);

      const created = await createDataset(NEW_DATASET);
      const deleted = await deleteDataset(3);

      expect(created).toEqual({ ok: false, error: "in_review", data: null });
      expect(deleted).toEqual({ ok: false, error: "in_review" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    },
  );

  it("allows a non-author Editor in review", async () => {
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));
    routeLookups(true);

    const created = await createDataset(NEW_DATASET);
    const deleted = await deleteDataset(3);

    expect(created.ok).toBe(true);
    expect(deleted.ok).toBe(true);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "POST",
      "DELETE",
    ]);
  });

  it("forbids deleting a dataset that has no droplet", async () => {
    mockedRequireRole.mockResolvedValue(as(9, Role.ContentEditor));
    routeLookups(false, false);

    const result = await deleteDataset(3);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still reports validation errors to an authorized caller", async () => {
    mockedRequireRole.mockResolvedValue(as(7, Role.ContentCreator));
    routeLookups();

    const result = await createDataset({ ...NEW_DATASET, name: "" });

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ids that are not plain integers", () => {
  it("refuses an object id with no lookup or write", async () => {
    const sneaky = { id: 1, documentId: "frozendoc" } as never;
    mockedRequireRole.mockResolvedValue(as(1, Role.SysAdmin));
    routeLookups();

    expect(await deleteDataset(sneaky)).toEqual({
      ok: false,
      error: "forbidden",
    });
    const created = await createDataset({ ...NEW_DATASET, droplet: sneaky });
    expect(created.ok).toBe(false);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
