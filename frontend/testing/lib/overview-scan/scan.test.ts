/** @jest-environment node */
import { getDropletById } from "@/lib/requests/droplet";
import { CHECKS } from "@/lib/overview-scan/checks";
import { createSafeFetcher } from "@/lib/overview-scan/network";
import { runChecks } from "@/lib/overview-scan/run";
import {
  SCAN_DROPLET_QUERY,
  loadScanDocument,
  scanDroplet,
} from "@/lib/overview-scan/scan";
import {
  buildScanDocument,
  type ScanSourceDroplet,
  type ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";

jest.mock("@/lib/requests/droplet", () => ({ getDropletById: jest.fn() }));
jest.mock("@/lib/overview-scan/network", () => ({
  createSafeFetcher: jest.fn(),
}));
jest.mock("@/lib/overview-scan/run", () => ({ runChecks: jest.fn() }));

jest.mock("@/lib/overview-scan/snapshot", () => {
  const actual = jest.requireActual("@/lib/overview-scan/snapshot");
  return { ...actual, buildScanDocument: jest.fn(actual.buildScanDocument) };
});

const buildSpy = buildScanDocument as jest.Mock;
const getDroplet = getDropletById as jest.Mock;
const fetcher = jest.fn();

describe("scanDroplet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createSafeFetcher as jest.Mock).mockReturnValue(fetcher);
  });

  it("reads fresh, orders lessons, builds the fetcher last and drops extra run members", async () => {
    getDroplet.mockResolvedValue({
      id: 7,
      name: "D",
      lessons: [
        { id: 2, name: "B", orderIndex: 2 },
        { id: 1, name: "A", orderIndex: 1 },
      ],
    });
    (runChecks as jest.Mock).mockResolvedValue({
      rulesVersion: "v",
      passed: 1,
      needsAttention: 2,
      couldNotCheck: 3,
      results: [],
      extra: "dropped",
    });

    const result = await scanDroplet(7);

    expect(getDroplet).toHaveBeenCalledWith(7, SCAN_DROPLET_QUERY, {
      fresh: true,
    });
    expect(buildSpy.mock.calls[0][1].map((l: { id: number }) => l.id)).toEqual([
      1, 2,
    ]);
    const fetcherOrder = (createSafeFetcher as jest.Mock).mock
      .invocationCallOrder[0];
    expect(fetcherOrder).toBeGreaterThan(buildSpy.mock.invocationCallOrder[0]);
    expect(fetcherOrder).toBeLessThan(
      (runChecks as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(createSafeFetcher).toHaveBeenCalledTimes(1);
    expect(runChecks).toHaveBeenCalledWith(expect.anything(), CHECKS, fetcher);
    expect(result).toEqual({
      rulesVersion: "v",
      passed: 1,
      needsAttention: 2,
      couldNotCheck: 3,
      results: [],
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("builds a document from a droplet shaped like SCAN_DROPLET_QUERY", () => {
    const queried: Required<ScanSourceDroplet> = {
      id: 7,
      name: "D",
      overview: "<p>o</p>",
      description: "d",
      difficulty: "beginner",
      funFact: "f",
      originalDropletId: 5,
      tags: [{ name: "t" }],
      learningObjectives: [{ objective: "o" }],
      nextSteps: [{ label: "l", url: "https://example.com" }],
      prerequisites: [
        { id: 1, name: "p", status: "published", isHidden: false },
      ],
      postrequisites: [
        { id: 2, name: "q", status: "published", isHidden: false },
      ],
      datasets: [
        { name: "n", fileUrl: "https://example.com/a.csv", rowCount: 1 },
      ],
    };
    const queriedLesson: Required<ScanSourceLesson> = {
      id: 1,
      name: "A",
      blocksVersion: "v2",
      blocksV2: [],
      blocks: [],
    };
    const doc = buildScanDocument(queried, [queriedLesson]);
    expect(doc.droplet.name).toBe("D");

    // Every member the snapshot reads must be in the query, and the reverse.
    const populate = SCAN_DROPLET_QUERY.populate as Record<
      string,
      { fields?: string[]; populate?: object }
    >;
    const dropletKeys = [
      ...(SCAN_DROPLET_QUERY.fields ?? []),
      ...Object.keys(populate).filter((k) => k !== "lessons"),
    ];
    expect(
      Object.keys(queried)
        .filter((k) => k !== "id")
        .sort(),
    ).toEqual(dropletKeys.sort());
    const lessonKeys = [
      ...(populate.lessons.fields ?? []).filter(
        (k) => k !== "orderIndex" && k !== "slug", // slug is for page links
      ),
      ...Object.keys(populate.lessons.populate ?? {}),
    ];
    expect(
      Object.keys(queriedLesson)
        .filter((k) => k !== "id")
        .sort(),
    ).toEqual(lessonKeys.sort());
  });

  it("sorts lessons by orderIndex (nulls last) then id, in the query and in memory", () => {
    const populate = SCAN_DROPLET_QUERY.populate as Record<
      string,
      { sort?: string[] }
    >;
    expect(populate.lessons.sort).toEqual(["orderIndex:asc", "id:asc"]);
    expect(populate.datasets.sort).toEqual(["createdAt:asc", "id:asc"]);
  });
});

describe("loadScanDocument ordering (ODY-878)", () => {
  const lessons = [
    { id: 5, name: "E", orderIndex: null },
    { id: 3, name: "C", orderIndex: 1 },
    { id: 2, name: "B", orderIndex: 1 },
    { id: 4, name: "D", orderIndex: null },
    { id: 1, name: "A", orderIndex: 0 },
  ];
  const load = async (order: number[]) => {
    getDroplet.mockResolvedValue({
      id: 7,
      name: "D",
      lessons: order.map((i) => lessons[i]),
    });
    return loadScanDocument(7);
  };

  it("gives the same document and hash whatever order tied or null lessons arrive in", async () => {
    const a = await load([0, 1, 2, 3, 4]);
    const b = await load([4, 3, 2, 1, 0]);
    const c = await load([2, 0, 4, 1, 3]);
    expect(a.doc.parts.map((p) => p.id)).toEqual([
      "droplet",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(b.doc).toEqual(a.doc);
    expect(c.doc).toEqual(a.doc);
    expect(b.contentHash).toBe(a.contentHash);
    expect(c.contentHash).toBe(a.contentHash);
    expect(a.doc.parts[2].title).toBe("Lesson 2 · B");
  });
});
