/**
 * ODY-675: joining a voyage records the steps whose droplet (or every droplet
 * of whose playlist) the user already completed, and never records a step
 * twice.
 */

import {
  enrollInVoyage,
  enrollInVoyageDirect,
} from "@/lib/requests/voyage-enrollment";
import { fetchAPI } from "@/lib/utils";
import { getCachedUser } from "@/lib/requests/cached";
import { requireRole } from "@/lib/auth/require-role";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { authFixtures } from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
  STRAPI_RESPONSE_FORMAT_HEADER: {},
}));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));

const USER_ID = 42;
const VOYAGE_ID = 10;
const ENROLLMENT = { id: 5, documentId: "enr5" };

const dropletNode = (id: number, dropletId: number) => ({
  id,
  documentId: `node${id}`,
  nodeType: "droplet",
  branchType: "required",
  droplet: { id: dropletId, status: "published" },
});
const playlistNode = (id: number, dropletIds: number[]) => ({
  id,
  documentId: `node${id}`,
  nodeType: "playlist",
  branchType: "required",
  playlist: { id: 700 + id, droplets: dropletIds.map((d) => ({ id: d })) },
});

const NODES = [
  dropletNode(100, 1), // droplet 1 complete -> recorded
  dropletNode(101, 2), // droplet 2 not complete
  playlistNode(102, [1, 3]), // all complete -> recorded
  playlistNode(103, [1, 2]), // droplet 2 missing
];

type Completion = { id: number; voyageNode: { id: number } };

let completions: Completion[];
let completedDropletIds: number[];

const mockedFetchAPI = jest.mocked(fetchAPI);
const fetchMock = jest.fn();

const ok = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data }),
  text: () => Promise.resolve(""),
});

function routeFetchAPI() {
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path.startsWith("/voyages/")) {
      return { id: VOYAGE_ID, documentId: "voy10", status: "published" };
    }
    if (path === "/voyage-enrollments") return []; // not enrolled yet
    if (path === "/voyage-nodes") return NODES;
    if (path === "/enrollments") {
      return completedDropletIds.map((d) => ({
        id: 900 + d,
        droplet: { id: d },
      }));
    }
    if (path === "/voyage-node-completions") return [...completions];
    throw new Error(`unexpected fetchAPI ${path}`);
  }) as never);
}

function routeFetch() {
  fetchMock.mockImplementation(
    async (url: string, init: { method: string; body?: string }) => {
      if (init.method === "POST" && url.endsWith("/api/voyage-enrollments")) {
        return ok(ENROLLMENT);
      }
      if (
        init.method === "POST" &&
        url.endsWith("/api/voyage-node-completions")
      ) {
        const { voyageNode } = JSON.parse(init.body!).data;
        const nodeId = Number(String(voyageNode).replace("node", ""));
        completions.push({ id: 1000 + nodeId, voyageNode: { id: nodeId } });
        return ok({ id: 1000 + nodeId });
      }
      if (init.method === "PUT") return ok(ENROLLMENT);
      throw new Error(`unexpected fetch ${init.method} ${url}`);
    },
  );
}

const callsTo = (method: string, suffix: string) =>
  fetchMock.mock.calls.filter(
    ([url, init]) => init.method === method && String(url).includes(suffix),
  );

const completionBodies = () =>
  callsTo("POST", "/api/voyage-node-completions").map(
    ([, init]) => JSON.parse(init.body).data,
  );

const percentageSaved = () => {
  const puts = callsTo("PUT", "/api/voyage-enrollments/enr5");
  return puts.map(
    ([, init]) => JSON.parse(init.body).data.completionPercentage,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  mockedFetchAPI.mockReset();
  completions = [];
  completedDropletIds = [1, 3];
  routeFetchAPI();
  routeFetch();
  jest
    .mocked(requireRole)
    .mockResolvedValue(authFixtures.as({ id: USER_ID }) as never);
  jest.mocked(getCachedUser).mockResolvedValue({ id: USER_ID } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("enrollInVoyage records steps finished before joining", () => {
  it("marks a droplet step complete when its droplet was completed first", async () => {
    const result = await enrollInVoyage(VOYAGE_ID);

    expect(result).toEqual({ ok: true, error: null, data: ENROLLMENT });
    expect(completionBodies()).toEqual([
      {
        voyageNode: "node100",
        voyageEnrollment: "enr5",
        authorizedUser: "doc42",
        completedAt: expect.any(String),
      },
      expect.objectContaining({ voyageNode: "node102" }),
    ]);
    // 2 of the 4 required steps are done.
    expect(percentageSaved()).toEqual([50]);
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(USER_ID),
    );
  });

  it("reads completed enrollments fresh for only this user and the voyage's droplets", async () => {
    await enrollInVoyage(VOYAGE_ID);

    const enrollmentsCall = mockedFetchAPI.mock.calls.find(
      ([path]) => path === "/enrollments",
    );
    expect(enrollmentsCall?.[1]).toEqual(
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: {
            $and: [
              { authorizedUser: { id: { $eq: USER_ID } } },
              { droplet: { id: { $in: [1, 2, 3] } } },
              { isComplete: { $eq: true } },
            ],
          },
        }),
        next: { revalidate: 0 },
      }),
    );
  });

  it("does not record a step twice", async () => {
    completions = [{ id: 1100, voyageNode: { id: 100 } }];

    await enrollInVoyage(VOYAGE_ID);

    expect(completionBodies().map((b) => b.voyageNode)).toEqual(["node102"]);
    expect(completions.filter((c) => c.voyageNode.id === 100)).toHaveLength(1);
  });

  it("writes nothing when every finished step is already recorded", async () => {
    completions = [
      { id: 1100, voyageNode: { id: 100 } },
      { id: 1102, voyageNode: { id: 102 } },
    ];

    await enrollInVoyage(VOYAGE_ID);

    expect(completionBodies()).toEqual([]);
    expect(callsTo("PUT", "/api/voyage-enrollments")).toHaveLength(0);
  });

  it("writes nothing when no step's droplets are complete", async () => {
    completedDropletIds = [];

    const result = await enrollInVoyage(VOYAGE_ID);

    expect(result.ok).toBe(true);
    expect(completionBodies()).toEqual([]);
    expect(callsTo("PUT", "/api/voyage-enrollments")).toHaveLength(0);
  });

  it("still joins the voyage when recording steps fails", async () => {
    mockedFetchAPI.mockImplementation((async (path: string) => {
      if (path.startsWith("/voyages/")) {
        return { id: VOYAGE_ID, documentId: "voy10", status: "published" };
      }
      if (path === "/voyage-enrollments") return [];
      throw new Error("Strapi down");
    }) as never);

    const result = await enrollInVoyage(VOYAGE_ID);

    expect(result).toEqual({ ok: true, error: null, data: ENROLLMENT });
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.voyageEnrollments(USER_ID),
    );
  });

  it("does not re-run when the user is already enrolled", async () => {
    mockedFetchAPI.mockImplementation((async (path: string) => {
      if (path.startsWith("/voyages/")) {
        return { id: VOYAGE_ID, documentId: "voy10", status: "published" };
      }
      if (path === "/voyage-enrollments") return [ENROLLMENT];
      throw new Error(`unexpected fetchAPI ${path}`);
    }) as never);

    await enrollInVoyage(VOYAGE_ID);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("enrollInVoyageDirect (group enrollment)", () => {
  it("records the member's finished steps without a session for that member", async () => {
    const result = await enrollInVoyageDirect(77, VOYAGE_ID);

    expect(result.ok).toBe(true);
    expect(requireRole).not.toHaveBeenCalled();
    expect(completionBodies()).toEqual([
      expect.objectContaining({
        voyageNode: "node100",
        authorizedUser: "doc77",
        voyageEnrollment: "enr5",
      }),
      expect.objectContaining({ voyageNode: "node102" }),
    ]);
    const enrollmentsCall = mockedFetchAPI.mock.calls.find(
      ([path]) => path === "/enrollments",
    );
    expect(JSON.stringify(enrollmentsCall?.[1])).toContain(
      '{"authorizedUser":{"id":{"$eq":77}}}',
    );
    expect(percentageSaved()).toEqual([50]);
  });
});
